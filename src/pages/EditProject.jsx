import  placeholder_image from "../assets/placeholder.jpeg";
import { useState} from "react";
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
import { refreshProjectSessionLock, 
         releaseProjectSessionLock } from "../lock_handling.jsx";
import { getClientID } from "../client_id.jsx";



/**
 * SortableBoard Component
 * 
 * This component wraps a single Board component to make it draggable and sortable 
 * within a list of boards. It also handles double-click events on the board.
 * 
 * Props:
 * - id: Unique identifier for the board, used internally by the drag-and-drop system.
 * - board: An object containing all the board's data, passed directly to the Board component.
 * - onDoubleClick: A callback function that is triggered when the board is double-clicked.
 * 
 *
 * Functionality:
 * 1. Makes the board draggable using the sortable utilities:
 *    - `setNodeRef`:
 *        This function gives the library a reference to the actual DOM (in-memory representation of HTML) element representing this board.
 *        The library needs to know which element to manipulate when dragging starts, moves, or ends.
 *
 *    - `listeners`:
 *        This object contains all the necessary event handlers to make the element respond to drag interactions.
 *        It includes mouse and touch events such as `onPointerDown`, `onPointerMove`, and `onPointerUp`.
 *        By spreading `listeners` on the element, the board can be clicked, dragged, and released properly.
 *        Essentially, it connects the board DOM element to the library's drag system.
 *
 *    - `attributes`:
 *        This object adds accessibility and internal metadata to the board element.
 *        This lets assistive technologies know that this element can be dragged. It may also include internal IDs used by the library to track
 *        the draggable item.
 *
 * 2. Handles double-click events:
 *    - Triggers the `onDoubleClick` callback provided by the parent component.
 */

function SortableBoard(props) {
  const { id, board, onDoubleClick } = props;
  const { setNodeRef, listeners, attributes, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    //Changes the curosor when dragging vs not currently dragging
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

// Extracts the "id" parameter from the URL
const { id } = useParams();
// Hook to navigate between pages/routes
const navigate = useNavigate();


  /*==========Stateful Variables=============================*/

// Holds the form data for creating a new board
const [newBoard, setNewBoard] = useState({title: "", shot: null, description: "", duration: null, transition: "", aspect_ratio: "", camera_angle: "", camera_movement: "", lens_focal_mm: ""});

// Stores the list of all boards in the current project
const [boards, setBoards] = useState([]);

// Tracks the currently selected board for viewing or editing
const [selectedBoard, setSelectedBoard] = useState(null);

// Controls visibility of the board deletion confirmation modal
const [deleteModalOpen, setDeleteModalOpen] = useState(false);

// Controls visibility of the modal used to add a new board
const [Modalopen, ModalsetOpen] = useState(false);

// Controls visibility of the modal used to edit a selected board
const [editModalOpen, setEditModalOpen] = useState(false);

// Stores the title of the current project
const [projectTitle, setProjectTitle] = useState("");

// Indicates whether the animatic playback is currently active
const [isPlaying, setIsPlaying] = useState(false);

// Tracks the index of the board currently being shown during animatic playback
const [currentAnimaticBoardIndex, setCurrentAnimaticBoardIndex] = useState(0);

// Stores the interval ID for controlling the animatic playback loop (2 seconds per board currently)
const [animaticIntervalId, setAnimaticIntervalId] = useState(null);


/*========== Add, Update, Fetch -  Board Functions =============================*/
/*========== Delete handled in DeleteBoardModal.jsx ============================*/

/**
 * Handles adding a new board to the current project.
 *
 * Functionality:
 * 1. Prevents the default form submission behavior.
 * 2. Converts the duration and lens focal length fields to numbers, or null if empty.
 * 3. Calls the Supabase stored procedure 'add_board' to insert the new board into the database.
 *    - Passes all relevant board fields (title, description, duration, transition, aspect ratio, camera angle, camera movement, lens focal length, and image URL).
 * 4. If there is an error during insertion, logs it to the console and stops execution.
 * 5. Resets the newBoard state to empty/default values to clear the form.
 * 6. Refreshes the list of boards and related project info by calling fetchBoards().
 * 7. Closes the "Add Board" modal after successful addition.
 */
const handleAddBoard = async (e) => {
  e.preventDefault();

  //If duration or lens focal length is empty string, set to null
  //Otherwise, convert to number
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

  // Reset form
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

  //update frontend
  fetchBoards();
  ModalsetOpen(false);
};

// Fetches all boards associated with the current project from the database
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

// Updates a board's fields in the database (used in EditModal)
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


/*==========Project Level Functions=============================*/

//Releases the session lock upon exiting the project and navigates back to project page
//Currently, this is triggered when user clicks "Back to Projects" button`
const handleExitProject = async () => {
  if (id) {
    const projectId = parseInt(id);
    await releaseProjectSessionLock(projectId);
  }
  navigate('/CreateProject');
}

// Fetches the title of the current project from the database, using the project ID from the URL
// Ensures the project title is displayed in the UI when the component mounts.
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


/*==========Drag-and-Drop Function=============================*/

/**
 * Handles the end of a drag-and-drop operation for reordering boards.
 *
 * This function is called automatically by the DnD-Kit library when a drag action ends.
 * It updates the frontend immediately, acquires a drag lock to prevent conflicts, 
 * persists the new order to the database, and then releases the lock.
 *
 * Parameters:
 * - active: The board object that is currently being dragged. Contains the board's ID.
 * - over: The board object that is currently under the dragged board when it is released. Contains the board's ID.
 */
async function onDragEnd({ active, over }) {
  // --------------------------------------------------
  // Step 1: Ignore invalid drops
  // --------------------------------------------------
  // If there is no board under the dragged item (over is null)
  // or the dragged board was dropped in the same position, do nothing.
  if (!over || active.id === over.id) {
    return;
  }

  // --------------------------------------------------
  // Step 2: Find the old and new positions of the dragged board
  // --------------------------------------------------
  const oldIndex = boards.findIndex(b => b.id === active.id);
  const newIndex = boards.findIndex(b => b.id === over.id);

  if (oldIndex === -1 || newIndex === -1) {
    return;
  }

  // --------------------------------------------------
  // Step 3: Optimistically update frontend order
  // --------------------------------------------------
  // Move the dragged board to its new position in the local state immediately.
  // This makes the drag feel responsive to the user.
  const reordered = arrayMove(boards, oldIndex, newIndex);
  setBoards(reordered);

  // --------------------------------------------------
  // Step 4: Acquire drag lock before persisting changes
  // --------------------------------------------------
  // Ensure that only one user can reorder boards at a time.
  try {
    const gotLock = await acquireDragLock(id);

    // If lock is not acquired, revert frontend order to match database
    if (!gotLock) {
      alert("Another user is currently reordering boards. Reverting order.");
      // Fetch the current order from database to revert frontend
      const { data: currentBoards, error } = await supabase
        .from("boards")
        .select("*")
        .eq("project_id", id)
        .order("shot", { ascending: true });

      if (!error && currentBoards) {
        setBoards(currentBoards);
      } else {
        console.error("Failed to fetch boards to revert order:", error?.message);
      }
      return;
    }

    // --------------------------------------------------
    // Step 5: Persist new board order in the database
    // --------------------------------------------------
    for (let i = 0; i < reordered.length; i++) {
      const { error } = await supabase
        .from("boards")
        .update({ shot: i + 1 }) 
        .eq("id", reordered[i].id);

      if (error) {
        console.error("Error updating shot:", error.message);
      }
    }

  } catch (err) {
    // If any error occurs, try to revert frontend order
    console.error("Drag reorder failed:", err);
    const { data: currentBoards, error } = await supabase
      .from("boards")
      .select("*")
      .eq("project_id", id)
      .order("shot", { ascending: true });

    if (!error && currentBoards) {
      setBoards(currentBoards);
    }
  } finally {
    // --------------------------------------------------
    // Step 6: Release the drag lock
    // --------------------------------------------------
    try {
      await releaseDragLock(id);
    } catch (e) {
      console.error("Error releasing drag lock:", e);
    }
  }
}

/*==========Animatic Playback Functions=============================*/

/**
 * Starts animatic playback for the current project.
 *
 * Functionality:
 * 1. Checks if there are any boards to play. If none, alerts the user and exits.
 * 2. Stops any existing animatic playback by clearing the previous interval.
 * 3. Determines the starting index for playback:
 *    - If a board is currently selected, playback starts from that board.
 *    - Otherwise, starts from the first board.
 * 4. Updates state to track the current board index and marks playback as active.
 * 5. Sets the first board to display as the selected board.
 * 6. Starts a recurring interval (every 2 seconds) to advance the animatic:
 *    - Increments the current board index.
 *    - Updates the selected board to match the new index.
 *    - Stops playback and clears the interval when the end of the boards list is reached.
 * 7. Stores the interval ID in state so playback can be stopped later if needed.
 *
 * State updates used:
 * - setCurrentAnimaticBoardIndex: tracks which board is currently being displayed.
 * - setIsPlaying: indicates whether the animatic is actively playing (needed for UI updates).
 * - setSelectedBoard: updates the board currently shown in the main view.
 * - setAnimaticIntervalId: stores the interval ID for stopping the animatic.
 *    - Essentially creates a time based loop to cycle through boards automatically.
 *    - The setInterval function is called every 2 seconds until all boards have been shown or playback is stopped.
 */
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
  }, 2000);

  setAnimaticIntervalId(intervalId);
};

// Stops the animatic playback 
// - Usages: 
//  1. When user clicks Stop button
//  2. When user double clicks a board to edit/view details
const stopAnimatic = () => {
  if (animaticIntervalId) {
    clearInterval(animaticIntervalId);
    setAnimaticIntervalId(null);
  }
  setIsPlaying(false);
};


// Stops animatic if playing and selects the double-clicked board
const handleBoardDoubleClick = (board) => {
  if (isPlaying) {
    stopAnimatic();
  }
  setSelectedBoard(board);
};

// Handles Play button click to start animatic playback
// Ignores click if already playing
const handlePlayButtonClick = () => {
  if (isPlaying) return; 
  startAnimatic();
}

// Handles Stop button click to stop animatic playback
const handleStopButtonClick = () => {
  stopAnimatic();
}

/*==========useEffects=============================*/

// Initial fetch of boards and project title when you enter a project
useEffect(() => {
  fetchBoards();
  fetchProjectTitle();
}, []);

//Refresh project session lock on user activity
useEffect(() => {
  const projectId = parseInt(id);
  
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
  };
}, [id]); 


//Monitor project deletion and navigate to Project Page if deleted
//Checks every 3 seconds
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
      handleExitProject();
    }
  };

  // Check every 3 seconds
  const projectCheckInterval = setInterval(async () => {
    await checkProjectExists();
  }, 3000);

  return () => {
    clearInterval(projectCheckInterval);
  };
}, [id, navigate]);



// Monitor board edit lock when modal is open
// Close modal and set selected board to null if lock is lost
// Checks every 3 seconds
// (Lock can be lost because of the inactivity timeout)
useEffect(() => {
  if (!editModalOpen || !selectedBoard) return;

  const checkBoardLock = async () => {
    const clientId = getClientID();
    
    // Check if board lock still exists
    const { data: lock, error } = await supabase
      .from('exclusive_resource_locks')
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
  const lockCheckInterval = setInterval(checkBoardLock, 3000);

  return () => clearInterval(lockCheckInterval);
}, [editModalOpen, selectedBoard]);

  
/*====Supabase Realtime Subscriptions============================*/

/**
 * useEffect: Real-time synchronization of project boards and project info
 *
 * This effect establishes a Supabase Realtime channel for the current project.
 * It listens for any INSERT, UPDATE, or DELETE events on the 'boards' table and
 * UPDATE events on the 'projects' table. The frontend automatically reacts to these
 * changes to keep the state in sync with the database.
 *
 * Key responsibilities:
 * - When a board is added, the board list is refreshed.
 * - When a board is updated, the board list is refreshed and the selected board
 *   is updated if it matches the updated board (unless it is currently being edited).
 * - When a board is deleted, the selected board and edit modal are cleared if affected,
 *   and animatic playback is stopped if it was showing the deleted board.
 * - When the project itself is updated (e.g., title change), the project title is updated.
 *
 * Dependencies:
 * - id: Ensures the channel is set up for the correct project.
 * - editModalOpen: Prevents overwriting a board that is currently being edited.
 * - selectedBoard: Needed to handle cases where the deleted board is currently selected.
 */
useEffect(() => {
  // Guard clause: exit early if project ID is missing
  if (!id) return;

  // Create a Supabase Realtime channel specific to this project
  const channel = supabase.channel(`project-${id}-boards`);

  // Listen for new boards added to this project
  channel.on(
    'postgres_changes', 
    {
      event: 'INSERT',             
      schema: 'public',            
      table: 'boards',             
      filter: `project_id=eq.${id}` 
    },
    (payload) => {
      console.log('Board INSERT:', payload); 
      // Refresh the frontend boards state to include the new board
      fetchBoards(); 
    }
  );

  // Listen for updates to existing boards in this project
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',             
      schema: 'public',            
      table: 'boards',             
      filter: `project_id=eq.${id}` 
    },
    (payload) => {
      console.log('Board UPDATE:', payload);

      // Refresh all boards in the frontend
      fetchBoards(); 

      // Update selected board if it matches the updated board and is not being edited
      setSelectedBoard((prev) => {
        if (prev && prev.id === payload.new.id && !editModalOpen) {
          return { ...prev, ...payload.new }; 
        }
        return prev;
      });
    }
  );

  // Listen for updates to the project itself (e.g., title changes)
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'projects',
      filter: `id=eq.${id}` 
    },
    (payload) => {
      console.log('Project UPDATE detected:', payload);

      // Update project title if changed
      if (payload.new.title) {
        setProjectTitle(payload.new.title);
      }
    }
  );

  // Listen for deleted boards
  channel.on(
    'postgres_changes', 
    {
      event: 'DELETE', 
      schema: 'public', 
      table: 'boards'
    },
    (payload) => {
      console.log('Board DELETE detected:', payload);

      // If the deleted board is currently selected or being edited
      if (selectedBoard && selectedBoard.id === payload.old.id) {
        setSelectedBoard(null);

        // Close edit modal
        if (editModalOpen) {
          setEditModalOpen(false); 
        }

        if (isPlaying) {
          // Stop animatic if it was showing this board
          stopAnimatic(); 
        }
      }

      // Refresh boards list to remove the deleted board
      fetchBoards(); 
    }
  );

  // Subscribe to the channel to start receiving events
  channel.subscribe();

  // Cleanup function: unsubscribe when component unmounts or dependencies change
  return () => {
    channel.unsubscribe(); 
  };

}, [id, editModalOpen, selectedBoard]);


  
  /**
 * ============================ ProjectBoard Component ============================
 *
 * This component renders the main interface for a single project. It includes:
 *  - A sortable list of boards (scenes) with drag-and-drop functionality.
 *  - A preview of the selected board's image.
 *  - Top navigation for project controls like going back and adding a board.
 *  - Right-side navigation showing detailed information about the selected board.
 *  - Animatic controls for playing and stopping a sequence of boards.
 *  - Modals for adding, editing, and deleting boards, with locking to prevent simultaneous edits.
 *
 * Features:
 *  - Drag-and-drop sorting of boards using DndContext and SortableContext.
 *  - Dynamic image preview with a fallback placeholder image.
 *  - Board detail panel with clear, edit, and delete actions.
 *  - Animatic playback controls and current status display.
 *  - Locking system to prevent multiple users from editing the same board simultaneously.
 *  - Modal management for all CRUD operations.
 *
 * State and props used:
 *  - boards: Array of board objects.
 *  - selectedBoard: Currently selected board.
 *  - projectTitle: Title of the current project.
 *  - isPlaying: Boolean indicating whether the animatic is currently playing.
 *  - currentAnimaticBoardIndex: Index of the currently playing board in the animatic.
 *  - Modalopen, editModalOpen, deleteModalOpen: Booleans controlling the visibility of modals.
 *  - Handlers: onDragEnd, handleBoardDoubleClick, handleAddBoard, handlePlayButtonClick, handleStopButtonClick, handleExitProject.
 *
 * Dependencies:
 *  - DndContext and SortableContext from the drag-and-drop library.
 *  - GeneralButton component for reusable buttons.
 *  - PlayButton and StopButton components for animatic controls.
 *  - Modal, EditModal, and DeleteBoardModal components for CRUD operations.
 *  - acquireLock and releaseLock functions for editing concurrency control.
 *  - placeholder_image as a fallback when no board image exists.
 *
 * =================================================================================
 */

return (
  <>
    {/* ========================= Boards Container ========================= */}
    <div className="boards_container">
      <DndContext 
        //Take the center point of the dragged item and find the closest center point of other items
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
          {/*
          Renders all boards as a sortable list.

          - SortableContext enables drag-and-drop reordering of boards.
          - Each board is rendered as a SortableBoard component.
          - The "id" prop is required for tracking during drag-and-drop.
          - Double-clicking a board selects it.
        */}
        <SortableContext items={boards.map((b) => b.id)}>
          {boards.map((b) => (
            <SortableBoard
              key={b.id}
              id={b.id}
              board={b}
              onDoubleClick={() => handleBoardDoubleClick(b)} // Select board on double click
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>

    {/* ========================= Board Image Preview ========================= */}
    <div className="image_container"> 
      {selectedBoard ? (
        <img 
          src={selectedBoard.image_url || placeholder_image} // Show placeholder if no image
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',    
            height: '100%',
            width: '100%',
            objectFit: 'contain'
          }}
          alt="Board preview"
        />
      ) : null}
    </div>

    {/* ========================= Top Navigation ========================= */}
    <div className="top_nav_container">
      <GeneralButton
        onClick={handleExitProject} // Navigate back to projects
        message="← Back to Projects"
      />
      <h2>Title: {projectTitle || "Loading..."}</h2>
      <GeneralButton 
        onClick={() => ModalsetOpen(true)} // Open Add Board modal
        message="Add Board"
      />
    </div>

    {/* ========================= Right Navigation / Board Info ========================= */}
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

          {/* Buttons for board actions */}
          <GeneralButton
            message="Clear Info"
            onClick={() => setSelectedBoard(null)}
          />
          <GeneralButton 
            onClick={async () => {
              const acquired = await acquireLock(selectedBoard.id); // Acquire lock before editing
              if (acquired) {
                setEditModalOpen(true);
              } else {
                alert('This board is currently being edited by someone else.');
              }
            }}
            message="Edit Board"
          />
          <GeneralButton
            message="Delete Board"
            variant="delete"
            onClick={() => {
              console.log("Delete button clicked, opening delete modal");
              setDeleteModalOpen(true);
            }}
          />
        </div>
      ) : (
        <p className="board-placeholder">Click a board to see details</p>
      )}
    </div>

    {/* ========================= Animatic Controls ========================= */}
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

    {/* ========================= Modals ========================= */}
    <div>
      {/* Add Board Modal */}
      <Modal
        message="Add Board"
        open={Modalopen}
        onClose={() => ModalsetOpen(false)}
        newBoard={newBoard}
        setNewBoard={setNewBoard}
        onSubmit={handleAddBoard}
        boards={boards}
      />

      {/* Edit Board Modal */}
      <EditModal
        message="Edit Board"
        open={editModalOpen}
        onClose={async () => {
          await releaseLock(selectedBoard.id); // Release lock when closing modal
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

      {/* Delete Board Confirmation Modal */}
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

            if (isPlaying) {
              stopAnimatic();
            }
          } catch (error) {
            alert(error.message);
            setDeleteModalOpen(false);
          }
        }}
      />
    </div>
  </>
);
}