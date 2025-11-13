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



import { useState } from "react";
//Everytime something happens -> Do whatever 
import { useEffect } from 'react';
import { DndContext } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Board from "../components/Boards.jsx";
import GeneralButton from "../components/GeneralButton.jsx"
import Modal from "../components/AddModal.jsx"
import EditModal from "../components/EditModal.jsx"
import { supabase } from "../supabase-client.js"
//Allows me to take the :id part of the url and use this info
import { useParams, useLocation } from "react-router-dom";
import playButton from "../assets/play_button.png"
import stopButton from "../assets/stop_button.png"
import { useNavigate } from "react-router-dom";
import { acquireLock } from "../lock_handling.jsx";
import { releaseLock } from "../lock_handling.jsx";
import { safeDeleteBoard } from "../lock_handling.jsx";
import { acquireProjectSessionLock,
         refreshProjectSessionLock, 
         releaseProjectSessionLock } from "../lock_handling.jsx";



function SortableBoard(props) {
  const { id, board, onDoubleClick } = props;
  const { setNodeRef, listeners, attributes, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onDoubleClick}
    >
      <Board {...board} />
    </div>
  );
}



//I need to figure out how the dnd-kit works
//I also need to figure out the useState and how that is being used for the modal
export default function EditProject() {
  //Returns an object with keys for each dynamic URL segment 
  //So in the case of /projects/5 - 5 would be returned
  const { id } = useParams();


  //State variable - a small amount of memory that React keeps between renders 
      //For this example - if I switched these boards around they would remain switched when the 
      //website is rendered
  //newBoard - current value 
  //setNewBoard - The function you are calling to change this current value
  //setNewBoards is updating these values
  //For making a new board

  //Add scene info back later if there is enough time
  const [newBoard, setNewBoard] = useState({title: "", shot: null, description: "", duration: null, transition: "", aspect_ratio: "", camera_angle: "", camera_movement: "", lens_focal_mm: ""})


  //For reading/viewing notes
  const [boards, setBoards] = useState([]);

  //I need this for clicking on a board to get information about it
  const [selectedBoard, setSelectedBoard] = useState(null);


  //Used for setting the information in the left container
  const [infoBoards, setInfoBoards] = useState([]);

//Cascasding and recursive renumbering to deal with conflicts
async function handleShotConflicts(projectID, newShot, ignoreID = null) {
  
  // Get ALL boards in the project ordered by shot
  const { data: allBoards, error } = await supabase 
    .from("boards")
    .select("id, shot")
    .eq("project_id", projectID)
    .order("shot", { ascending: true });

  if (error) {
    return;
  }


  const exactConflict = allBoards.find(board => 
    board.shot === newShot && (!ignoreID || board.id !== ignoreID)
  );

  if (!exactConflict) {
    return;
  }


  // Find all boards that need to be shifted (only if they form a continuous sequence)
  // Start from the conflict shot and find all consecutive boards
  let currentShot = newShot;
  const boardsToShift = [];
  
  while (true) {
    const boardAtCurrentShot = allBoards.find(board => board.shot === currentShot);
    if (boardAtCurrentShot && (!ignoreID || boardAtCurrentShot.id !== ignoreID)) {
      boardsToShift.push(boardAtCurrentShot);
      currentShot++;
    }
    else {
      break;
    }
  }


  // Shift boards in reverse order to avoid temporary conflicts
  for (let i = boardsToShift.length - 1; i >= 0; i--) {
    const board = boardsToShift[i];
    const newShotValue = board.shot + 1;
    
    const { error: updateError } = await supabase 
      .from("boards")
      .update({ shot: newShotValue })
      .eq("id", board.id);

    if (updateError) {
      return;
    }
  }

}



const handleAddBoard = async (e) => {
  e.preventDefault();

  //Handles shot number conflicts for boards
  const shotNumber = Number(newBoard.shot); 

  await handleShotConflicts(id, shotNumber); 

  const { error } = await supabase.from("boards").insert([{
    //Copies all properties of new board
    //If scene, shot, duration, and lens_focal_mm are an empty string, 
    //Then store null in its place
    ...newBoard,
    project_id: id,
    //Add this line back later if you have time for scene implementation
    //scene: newBoard.scene === "" ? null : Number(newBoard.scene),
    shot: newBoard.shot === "" ? null : Number(newBoard.shot),
    duration: newBoard.duration === "" ? null : Number(newBoard.duration),
    lens_focal_mm: newBoard.lens_focal_mm === "" ? null : Number(newBoard.lens_focal_mm.replace("mm", "")),
  }]);
    if (error) {
      console.error("Error adding board: ", error.message);
      return;
    }

    //Add the scene back later if there is time 
    setNewBoard({
    title: "",
    //scene: "",
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

//Triggers after first render, when there is different URL, and if a user leaves
//Aquires the project session lock so the project can't be deleted
useEffect(() => {
  if (!id) return;
   
  const projectId = parseInt(id);
  
  //Acquire a project session lock for this specific project 

  acquireProjectSessionLock(projectId);
  
  //This function will be called whenever the user does something in the project
  //moving their mouse for example
  const refreshLock = () => {
    refreshProjectSessionLock(projectId);
  };

  //Events to tell if a user is still using the complication
  const events = ['mousemove', 'keypress', 'click', 'scroll'];
  
  //For each of those user actions, set up a listener that calls our refreshLock function
  events.forEach(event => {
    document.addEventListener(event, refreshLock);
  });

  //Runs when the user leaves the project (when a component unmounts)
  return () => {
    //Removes all event listeners previously set up
    events.forEach(event => {
      document.removeEventListener(event, refreshLock);
    });
    
    //Releases the lock
    releaseProjectSessionLock(projectId);
  };
  //project ID
}, [id]); 

//Runs the fetchBoards function after the first rende So that the boards and data show up 
//Empty array means to only run once after the initial render
//The argument controls when the effect runs ( [] )
//Exp: 
useEffect(() => {
  fetchBoards();
  fetchInfo(); 
}, []);


//Update frontend for all clients if any client makes a change to the boards table
useEffect(() => {
  if (!id) return; 
  //A channel is just an webSocket object that listens for database 
  //changes 
  const channel = supabase 
  //channel name
  .channel(`project-${id}-boards`)
  //.on tells the channel specifically what to look for. In this instance it 
  //it looking for any post_gres changes
  
  // Listen for INSERT events - when new boards are added
  .on(
    'postgres_changes', 
    {
      event: 'INSERT', 
      schema: 'public', 
      table: 'boards', 
      filter: `project_id=eq.${id}`
    },
    //The payload is just the message supabase sends that details the changes made to the database
    //This function is the event handler - whenever a change is made to the database 
    //this function is called (with the payload parameter)
    (payload) => {
      console.log('Board INSERT:', payload)
      fetchBoards(); 
      fetchInfo();
    }
  )
  
  // Listen for UPDATE events - when boards are modified
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

    // Refresh boards and info
    fetchBoards(); 
    fetchInfo();

    // Update selectedBoard if it's the one that changed
    setSelectedBoard((prev) => {
      if (prev && prev.id === payload.new.id) {
        return { ...prev, ...payload.new };
      }
      return prev;
    });
  }
)
  
  // Listen for DELETE events - when boards are removed
  // Note: DELETE events don't support filters, so we fetch ALL deletes and refresh
  .on(
    'postgres_changes', 
    {
      event: 'DELETE', 
      schema: 'public', 
      table: 'boards'
    },

    (payload) => {
      console.log('Board DELETE detected:', payload)
      // For DELETE events, we can't filter by project_id, so we refresh regardless
      // This is safe because fetchBoards() only gets boards for our project
      console.log('Refreshing due to DELETE event')
      fetchBoards(); 
      fetchInfo();
    }
  )

  //.subscribe is needed to actually get the Realtime updates from other 
  //clients - events won't actually start being sent until you subscribe to this channel
  .subscribe(); 

  return () => {
    channel.unsubscribe();
  }
}, [id]);

//Used to get the board info from the database and 
//sort by Scene-Shot order
const fetchBoards = async () => {
  const {error, data} = await supabase 
    .from("boards")
    .select("*")
    //Makes sure the project id in the table matches 
    //that found from the URL (only these boards will be shown)
    .eq("project_id", id)
    //For now, get rid of the scenes. Add this later if you have time to add scene functionality
    //.order("scene", { ascending: true })
    .order("shot", { ascending: true });

    if (error) {
      console.error("Error reading board: ", error.message); 
      return;
    }

    setBoards(data);
}

//Information for the left container for each of the boards
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

    setInfoBoards(data); 
}

//Allows a user to update an existing board
const updateBoard = async (boardId, updatedFields) => {
  const { data: currentBoard, error: fetchError } = await supabase
    .from("boards")
    .select("shot")
    .eq("id", boardId)
    .single();

  if (fetchError) {
    console.error("Error fetching current board:", fetchError.message);
    return;
  }

  const currentShot = Number(currentBoard.shot);
  const newShot = Number(updatedFields.shot);

  if (newShot !== currentShot) {
    await handleShotConflicts(id, newShot, boardId); 
  }

  const {error} = await supabase 
    .from("boards")
    .update(updatedFields)
    .eq("id", boardId);

  if (error) {
    console.error("Error updating board", error.message);
    return;
  }

  fetchBoards();
  fetchInfo(); 
}

//Updates the shot of a board whenever boards are shifted around
//This needs to be better to deal with scenes 
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

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    setBoards((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      renumber(reordered); // update indexes
      setInfoBoards(reordered.map(({ id, title, shot }) => ({ id, title, shot })));
      return reordered
    });
  }

  //Opening and closing the Modal
  //Sets ModelOpen to false initially
  //ModelsetOpen - setter function to change the value of Modalopen
  //This is for the add board modal
  const [Modalopen, ModalsetOpen] = useState(false);


  //This is for the edit baord modal
  const [editModalOpen, setEditModalOpen] = useState(false);


  //Used to get the title from the URL
  const location = useLocation(); 
  const title = location.pathname.split("/").pop()

  //For animatic play button
  const handlePlayButtonClick = () => {
    alert("Play image clicked");
  }

  //For animatic stop button
  const handleStopButtonClick = () => {
    alert("Stop image clicked");
  }

  //Object to navigate between pages
  //Used for project button
  const navigate = useNavigate();
  return (
    <>
    <div className="boards_container">
      <DndContext onDragEnd={onDragEnd}>
        <SortableContext items={boards.map((b) => b.id)}>
          {boards.map((b) => (
            <SortableBoard
              key={b.id}
              id={b.id}
              board={b}
              //On double click - set SelectedBoard to the board that was double clicked
              onDoubleClick={() => setSelectedBoard(b)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>

<div className = "image_container"> 
    {selectedBoard ? (
      <img 
        src = {selectedBoard.image_url}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',    
            height: '100%',         
            width: '100%'           
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
      <h2>Title: {decodeURIComponent(title)}</h2>
      <GeneralButton 
        message = "Redo"
        >Redo
      </GeneralButton>
      <GeneralButton 
        message = "Undo"
        >Undo
      </GeneralButton>
      <GeneralButton 
        message = "Share"
        > Share 
      </GeneralButton>
      <GeneralButton 
        message = "Export"
        > Export
      </GeneralButton>


    </div>
    <div className="right_nav_container">
    {/*If selected board is not null - put all information on the screen
    else, put a placeholder message*/}
    {selectedBoard ? (
      <div className="board-info">
        <h2>Board Info</h2>
        <p><strong>Title:</strong> {selectedBoard.title}</p>
        {/*Add scenes back later if time*/}
        {/*<p><strong>Scene:</strong> {selectedBoard.scene}</p>*/}
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
        <GeneralButton 
          message="Delete Board" 
          onClick={async () => {
            try {
            await safeDeleteBoard(selectedBoard.id);

            setBoards(prev => prev.filter(b => b.id !== selectedBoard.id));
            setInfoBoards(prev => prev.filter(b => b.id !== selectedBoard.id));
            setSelectedBoard(null);
          } 
          catch (error) {
            alert(error.message);
          }
          }}
>Delete Board</GeneralButton>
      </div>
    ) : (
      <p className="board-placeholder">Click a board to see details</p>
    )
    }
          
    </div>
    {/*This is for the animatic feature at the bottom of the screen*/}
    <div className = "animatic_container">
      <img className = "play_button"
        src={playButton}
        onClick={handlePlayButtonClick}
      />

      <img className="stop_button"
        src={stopButton}
        onClick={handleStopButtonClick}
      />
      {/*Slider bar for animatic feature
      Set to read only for now - but this can be changed once made interactive*/}
      <input className="slider_bar" type="range" min="0" max="100" value="0" readOnly />
    </div>
    <div className="left_nav_container">
        {/*Clicking the button leads to ModalSetOpen function setting Modal open to true
        onClick needs a function so React can call it later when the user clicks
        The arrow is how you declare an inline function
        It is essentially a function without a name that's only job is to set ModalsetOpen to true.
        The parentheses before the function is the parameter list for it, we just don't need any arguments here*/}
        <GeneralButton 
          onClick={() => ModalsetOpen(true)}
          message = "Add Board"
          >Add Board
        </GeneralButton>


    {/*Used for listing the boards in the left container*/}
    <div className="board_list">
      {infoBoards.length > 0 ? (
        infoBoards.map((b) => (
          <div 
            key={b.id} 
            className="board_list_item"
            onClick={() => setSelectedBoard(b)}
          >
            <strong>Shot {b.shot}:</strong> {b.title}
          </div>
        ))
      ) : (
        <p>No boards yet</p>
      )}
    </div>



        {/* Pass the BOOLEAN state to `open`, not the setter */}
        <Modal
          message = "Add Board"
          open={Modalopen}
          onClose={() => ModalsetOpen(false)}
          newBoard={newBoard}
          setNewBoard={setNewBoard}
          onSubmit={handleAddBoard}
        />
      <EditModal
        message = "Edit Board"
        open={editModalOpen}
        onClose={async () => {
          await releaseLock(selectedBoard.id);
          setEditModalOpen(false);
        }}
        selectedBoard={selectedBoard}
        setSelectedBoard={setSelectedBoard}
        onSubmit={() => {
        updateBoard(selectedBoard.id, selectedBoard); // pass ID + updated fields
        setEditModalOpen(false);
      }}
    />
      </div>


  </>
  
    
  );


}