// DEV NOTES TO INCLUDE IN REPORT 
// -------------------------------
// 
// In some places I have called the fetchBoards and fetchInfo both locally 
// and across all clients - this is because the local updates were noticably faster 
// due to noticable latency when updating using a Realtime Channel
//
//
//
//
//
//
//
//
//
//
//


import  placeholder_image from "../assets/placeholder.jpeg";
import { useState } from "react";
//Everytime something happens -> have an effect to that action
import { useEffect } from 'react';
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Board from "../components/Boards.jsx"
import GeneralButton from "../components/BoardButton.jsx"
import Modal from "../components/AddModal.jsx"
import EditModal from "../components/EditModal.jsx"
import { supabase } from "../supabase-client.js"
//Allows me to take the :id part of the url and use this info
import { useParams } from "react-router-dom";
import { PlayButton } from "../assets/PlayButton.jsx";
import { StopButton } from "../assets/StopButton.jsx";
import { useNavigate } from "react-router-dom";
import { acquireLock } from "../lock_handling.jsx";
import { releaseLock } from "../lock_handling.jsx";
import { acquireDragLock, releaseDragLock } from "../lock_handling.jsx";
import { safeDeleteBoard } from "../lock_handling.jsx";
import  DeleteBoardModal  from "../components/DeleteBoardModal.jsx";
import { acquireProjectSessionLock,
         refreshProjectSessionLock, 
         releaseProjectSessionLock } from "../lock_handling.jsx";
import { getClientID } from "../client_id.jsx";




function SortableBoard(props) {
  const { id, board, onDoubleClick } = props;
  const { setNodeRef, listeners, attributes, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-id={id}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onDoubleClick();
      }}
    >
      <Board {...board} />
    </div>
  );
}



export default function EditProject() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [newBoard, setNewBoard] = useState({title: "", shot: null, description: "", duration: null, transition: "", aspect_ratio: "", camera_angle: "", camera_movement: "", lens_focal_mm: ""})
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [Modalopen, ModalsetOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Add state for project title
  const [projectTitle, setProjectTitle] = useState("");
  
  // Animatic functionality states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAnimaticBoardIndex, setCurrentAnimaticBoardIndex] = useState(0);
  const [animaticIntervalId, setAnimaticIntervalId] = useState(null);
  



const handleAddBoard = async (e) => {
  e.preventDefault();

  const duration = newBoard.duration === "" ? null : Number(newBoard.duration);
  const lens_focal_mm = newBoard.lens_focal_mm === "" ? null : Number(newBoard.lens_focal_mm.replace("mm",""));

  const { error } = await supabase.rpc('add_board', {
    p_project_id: Number(id),
    p_title: newBoard.title,
    p_description: newBoard.description,
    p_duration: duration,
    p_transition: newBoard.transition,
    p_aspect_ratio: newBoard.aspect_ratio,
    p_camera_angle: newBoard.camera_angle,
    p_camera_movement: newBoard.camera_movement,
    p_lens_focal_mm: lens_focal_mm,
    p_image_url: newBoard.image_url || null,
  });

  if (error) {
    console.error("Error adding board:", error.message);
    return;
  }

  // Reset form & update frontend
  setNewBoard({
    title: "",
    shot: "",
    description: "",
    duration: "",
    transition: "",
    aspect_ratio: "",
    camera_angle: "",
    camera_movement: "",
    lens_focal_mm: "",
  });

  fetchBoards();
  fetchInfo();
  ModalsetOpen(false);
};


useEffect(() => {
  if (!id) return;
   
  const projectId = parseInt(id);
  
  acquireProjectSessionLock(projectId);
  
  const refreshLock = () => {
    refreshProjectSessionLock(projectId);
  };

  const events = ['mousemove', 'keypress', 'click', 'scroll'];
  
  events.forEach(event => {
    document.addEventListener(event, refreshLock);
  });

  return () => {
    events.forEach(event => {
      document.removeEventListener(event, refreshLock);
    });
    
    releaseProjectSessionLock(projectId);
  };
}, [id]); 

// Fetch project title when component mounts
const fetchProjectTitle = async () => {
  if (!id) return;
  
  try {
    const { error, data } = await supabase
      .from("projects")
      .select("title")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching project title:", error.message);
      return;
    }

    if (data && data.title) {
      setProjectTitle(data.title);
    }
  } catch (err) {
    console.error("Error in fetchProjectTitle:", err);
  }
};

//Monitor project deletion and session lock
useEffect(() => {
  if (!id) return;
  
  const projectId = parseInt(id);
  
  // Check if project still exists
  const checkProjectExists = async () => {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      console.log('Project no longer exists, navigating away');
      alert('This project has been deleted.');
      navigate('/CreateProject');
      return false;
    }
    return true;
  };

  // Check project session lock
  const checkSessionLock = async () => {
    const clientId = getClientID();
    
    const { data: lock, error } = await supabase
      .from('not_exclusive_resource_locks')
      .select('*')
      .eq('resource_type', 'project_session')
      .eq('resource_id', projectId)
      .eq('locked_by', clientId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !lock) {
      console.log('Session lock lost, project may be deleted or session expired');
      // Check project existence one more time
      await checkProjectExists();
    }
  };

  // Check every 3 seconds
  const projectCheckInterval = setInterval(async () => {
    await checkProjectExists();
    await checkSessionLock();
  }, 3000);

  // Initial check
  checkProjectExists();

  return () => {
    clearInterval(projectCheckInterval);
  };
}, [id, navigate]);

useEffect(() => {
  fetchBoards();
  fetchInfo(); 
  fetchProjectTitle();
}, []);

// Monitor board edit lock when modal is open
useEffect(() => {
  if (!editModalOpen || !selectedBoard) return;

  const checkBoardLock = async () => {
    const clientId = getClientID();
    
    // Check if board lock still exists
    const { data: lock, error } = await supabase
      .from('board_resource_locks')
      .select('*')
      .eq('resource_type', 'board')
      .eq('resource_id', selectedBoard.id)
      .eq('locked_by', clientId)
      .maybeSingle();

    // If lock doesn't exist or has expired
    if (error || !lock) {
      console.log('Board edit lock lost, closing modal');
      setEditModalOpen(false);
      setSelectedBoard(null);
      alert('Someone else is now editing this board.');
      return false;
    }
    return true;
  };

  // Set up interval to check lock
  const lockCheckInterval = setInterval(checkBoardLock, 2000);

  // Also check on initial modal open
  checkBoardLock();

  return () => clearInterval(lockCheckInterval);
}, [editModalOpen, selectedBoard]);

useEffect(() => {
  if (!id) return; 
  
  const channel = supabase 
  .channel(`project-${id}-boards`)
  
  .on(
    'postgres_changes', 
    {
      event: 'INSERT', 
      schema: 'public', 
      table: 'boards', 
      filter: `project_id=eq.${id}`
    },
    (payload) => {
      console.log('Board INSERT:', payload)
      fetchBoards(); 
      fetchInfo();
    }
  )
  
.on(
  'postgres_changes', 
  {
    event: 'UPDATE', 
    schema: 'public', 
    table: 'boards', 
    filter: `project_id=eq.${id}`
  },
  (payload) => {
    console.log('Board UPDATE:', payload);

    fetchBoards(); 
    fetchInfo();

    setSelectedBoard((prev) => {
      if (prev && prev.id === payload.new.id && !editModalOpen) {
        return { ...prev, ...payload.new };
      }
      return prev;
    });
  }
)

.on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'projects',
    filter: `id=eq.${id}`
  },
  (payload) => {
    console.log('Project UPDATE detected:', payload);
    if (payload.new.title) {
      setProjectTitle(payload.new.title);
    }
  }
)
  
.on(
  'postgres_changes', 
  {
    event: 'DELETE', 
    schema: 'public', 
    table: 'boards'
  },
  (payload) => {
    console.log('Board DELETE detected:', payload)
    
    // Check if the deleted board is currently selected or being edited
    if (selectedBoard && selectedBoard.id === payload.old.id) {
      // Clear the selected board if it was deleted
      setSelectedBoard(null);
      
      // Also close the edit modal if it's open
      if (editModalOpen) {
        setEditModalOpen(false);
      }
      
      // If animatic was playing and this was the current board, stop it
      if (isPlaying) {
        stopAnimatic();
      }
    }
    
    fetchBoards(); 
    fetchInfo();
  }
)
  .subscribe(); 

  return () => {
    channel.unsubscribe();
  }
}, [id, editModalOpen, selectedBoard]);

// Clean up animatic interval on component unmount
useEffect(() => {
  return () => {
    if (animaticIntervalId) {
      clearInterval(animaticIntervalId);
    }
  };
}, [animaticIntervalId]);

const fetchBoards = async () => {
  const {error, data} = await supabase 
    .from("boards")
    .select("*")
    .eq("project_id", id)
    .order("shot", { ascending: true });

    if (error) {
      console.error("Error reading board: ", error.message); 
      return;
    }

    setBoards(data);
}

const fetchInfo = async () => {

  const {error, data} = await supabase
    .from("boards")
    .select("id, title, shot")
    .eq("project_id", id)
    .order("shot", {ascending: true});

    if (error) {
      console.error("Error fetching baord info: ", error.message); 
      return; 
    }

}

const updateBoard = async (boardId, updatedFields) => {
  try {
    const { error } = await supabase
      .from("boards")
      .update(updatedFields)
      .eq("id", boardId);

    if (error) {
      console.error("Error updating board:", error.message);
    }

  } catch (err) {
    console.error("Error in updateBoard:", err.message);
  }
};

async function renumber(list) {
  for (let i = 0; i < list.length; i++) {
    const board = list[i];

    const { error } = await supabase
      .from("boards")
      .update({ shot: i + 1 }) 
      .eq("id", board.id);

    if (error) {
      console.error("Error updating board:", error.message);
    }
  }
}

// ANIMATIC FUNCTIONS
const startAnimatic = () => {
  if (boards.length === 0) {
    alert("No boards to play");
    return;
  }

  // Stop any existing animatic
  if (animaticIntervalId) {
    clearInterval(animaticIntervalId);
  }

  // Determine starting index
  let startIndex = 0;
  if (selectedBoard) {
    // Find the index of the currently selected board
    const boardIndex = boards.findIndex(board => board.id === selectedBoard.id);
    if (boardIndex !== -1) {
      startIndex = boardIndex;
    }
  }

  setCurrentAnimaticBoardIndex(startIndex);
  setIsPlaying(true);

  // Set the first board
  setSelectedBoard(boards[startIndex]);

  // Start the interval
  const intervalId = setInterval(() => {
    setCurrentAnimaticBoardIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      
      // If we've reached the end, stop
      if (nextIndex >= boards.length) {
        clearInterval(intervalId);
        setIsPlaying(false);
        return prevIndex;
      }
      
      // Update to the next board
      setSelectedBoard(boards[nextIndex]);
      return nextIndex;
    });
  }, 2000); // 2 seconds per board

  setAnimaticIntervalId(intervalId);
};

const stopAnimatic = () => {
  if (animaticIntervalId) {
    clearInterval(animaticIntervalId);
    setAnimaticIntervalId(null);
  }
  setIsPlaying(false);
  
  // Keep the current selected board as is (paused state)
};


// Handle board double click (for sortable boards)
const handleBoardDoubleClick = (board) => {
  if (isPlaying) {
    stopAnimatic();
  }
  setSelectedBoard(board);
};


async function onDragEnd({ active, over }) {
  if (!over || active.id === over.id) {
    return;
  }

  // Try to acquire lock
  try {
    const gotLock = await acquireDragLock(id);
    
    if (!gotLock) {
      alert("Another user is currently reordering boards. Please wait a moment and try again.");
      
      // Refresh boards to ensure consistency
      fetchBoards();
      return;
    }

    // Perform reordering
    const oldIndex = boards.findIndex((i) => i.id === active.id);
    const newIndex = boards.findIndex((i) => i.id === over.id);

    // Validate indices
    if (oldIndex === -1 || newIndex === -1) {
      console.error("Invalid indices in drag operation");
      fetchBoards();
      return;
    }

    const reordered = arrayMove(boards, oldIndex, newIndex);

    // Update local state (this triggers smooth animation via dnd-kit)
    setBoards(reordered);

    // Persist to database
    await renumber(reordered);

  } catch (err) {
    console.error("Error during onDragEnd:", err);
    fetchBoards();
    fetchInfo();
  } finally {
    // Always try to release lock
    try {
      await releaseDragLock(id);
    } catch (releaseErr) {
      console.error("Error releasing drag lock:", releaseErr);
    }
  }
}

  const handlePlayButtonClick = () => {
    if (isPlaying) {
      stopAnimatic();
    } else {
      startAnimatic();
    }
  }

  const handleStopButtonClick = () => {
    stopAnimatic();
  }

  
  return (
    <>
    <div className="boards_container">
      <DndContext 
        onDragEnd={onDragEnd} 
        collisionDetection={closestCenter}
      >
        <SortableContext items={boards.map((b) => b.id)}>
          {boards.map((b) => (
            <SortableBoard
              key={b.id}
              id={b.id}
              board={b}
              onDoubleClick={() => handleBoardDoubleClick(b)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>

<div className = "image_container"> 
    {selectedBoard ? (
      <img 
        src = {selectedBoard.image_url || placeholder_image}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',    
            height: '100%',         
            width: '100%',
            objectFit: 'contain'
          }}
      />
    ) : null}
</div>


    <div className="top_nav_container">
      <GeneralButton 
        message = "Projects <--"
        onClick={() => navigate(`/CreateProject`)}
        >Back to Projects
      </GeneralButton>
      <h2>Title: {projectTitle || "Loading..."}</h2>
      <GeneralButton 
          onClick={() => ModalsetOpen(true)}
          message = "Add Board"
          >Add Board
      </GeneralButton>


    </div>
    <div className="right_nav_container">
    {selectedBoard ? (
      <div className="board-info">
        <h2>Board Info</h2>
        <p><strong>Title:</strong> {selectedBoard.title}</p>
        <p><strong>Shot:</strong> {selectedBoard.shot}</p>
        <p><strong>Description:</strong> {selectedBoard.description}</p>
        <p><strong>Duration:</strong> {selectedBoard.duration}</p>
        <p><strong>Transition:</strong> {selectedBoard.transition}</p>
        <p><strong>Aspect Ratio:</strong> {selectedBoard.aspect_ratio}</p>
        <p><strong>Camera Angle:</strong> {selectedBoard.camera_angle}</p>
        <p><strong>Camera Movement:</strong> {selectedBoard.camera_movement}</p>
        <p><strong>Lens Focal Length:</strong> {selectedBoard.lens_focal_mm}</p>

        <GeneralButton message="Clear Info" onClick={() => setSelectedBoard(null)}>Clear Info</GeneralButton>
      <GeneralButton 
        onClick={async () => {
          const acquired = await acquireLock(selectedBoard.id);
          if (acquired) {
            setEditModalOpen(true);
          } else {
            alert('This board is currently being edited by someone else.');
          }
        }}
        message="Edit Board"
      >
        Edit Board
      </GeneralButton>
      
      {/* Delete Board button */}
      <GeneralButton
        message="Delete Board"
        variant="delete"
        onClick={() => {
          console.log("Delete button clicked, setting deleteModalOpen to true");
          setDeleteModalOpen(true);
        }}
      >
        Delete Board
      </GeneralButton>
      </div>
    ) : (
      <p className="board-placeholder">Click a board to see details</p>
    )}
          
    </div>
    
<div className="animatic_container">
  <div 
    onClick={handlePlayButtonClick}
    style={{ 
      display: 'inline-block',
      opacity: isPlaying ? 0.5 : 1, 
      cursor: 'pointer',
      margin: '15px'
    }} 
  >
    <PlayButton className="play_button" />
  </div>

  <div 
    onClick={handleStopButtonClick}
    style={{ 
      display: 'inline-block',
      opacity: isPlaying ? 1 : 0.5, 
      cursor: 'pointer',
      margin: '5px'
    }}
  >
    <StopButton className="stop_button" />
  </div>
  
  {isPlaying && (
    <div style={{
      marginLeft: '10px',
      color: 'var(--accent-success)',
      fontWeight: '600',
      display: 'inline-block',
    }}>
      Playing... Board {currentAnimaticBoardIndex + 1} of {boards.length}
    </div>
  )}
</div>
    
    <div className="left_nav_container">

        <Modal
          message = "Add Board"
          open={Modalopen}
          onClose={() => ModalsetOpen(false)}
          newBoard={newBoard}
          setNewBoard={setNewBoard}
          onSubmit={handleAddBoard}
          boards={boards}
        />
        <EditModal
          message="Edit Board"
          open={editModalOpen}
          onClose={async () => {
            await releaseLock(selectedBoard.id);
            setEditModalOpen(false);
          }}
          selectedBoard={selectedBoard}
          setSelectedBoard={setSelectedBoard}
          onSubmit={async (boardId, updatedFields) => {
            await updateBoard(boardId, updatedFields);
            setEditModalOpen(false);
          }}
          onAutoSave={async (updatedFields) => {
            await updateBoard(selectedBoard.id, updatedFields);
          }}
        />
      </div>

  {/* Delete Confirmation Modal - MUST be at the end to appear on top */}
  <DeleteBoardModal
    open={deleteModalOpen}
    onCancel={() => {
      console.log("Delete modal cancelled");
      setDeleteModalOpen(false);
    }}
    onConfirm={async () => {
      console.log("Delete modal confirmed");
      try {
        await safeDeleteBoard(selectedBoard.id);
        
        setBoards(prev => prev.filter(b => b.id !== selectedBoard.id));
        setSelectedBoard(null);
        setDeleteModalOpen(false);
        
        // If animatic was playing, stop it
        if (isPlaying) {
          stopAnimatic();
        }
      } catch (error) {
        alert(error.message);
        setDeleteModalOpen(false);
      }
    }}
  />


  </>
  
    
  );


}
