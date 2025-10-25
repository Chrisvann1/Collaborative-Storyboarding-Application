import { useState } from "react";
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
    } else {
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


//Runs the fetchBoards function after the first render
//So that the boards show up 
useEffect(() => {
  fetchBoards();
  fetchInfo(); 
}, []);

console.log(boards);

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

//Allows a user to delete a board
const deleteBoard = async (id) => {

  const {data, error} = await supabase
    .from("boards")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting board: ", error.message);
    return;
  }

  // Remove deleted board from local state
  //Creates a new array containing all the boards except for the 
  //one with the ID we are trying to delete
  setBoards((prev) => prev.filter((b) => b.id !== id));
  setInfoBoards((prev) => prev.filter((b) => b.id !== id));

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
          onClick={() => setEditModalOpen(true)}
          message = "Edit Board"
          >Edit Board
        </GeneralButton>
        <GeneralButton message = "Delete Board" onClick={() => deleteBoard(selectedBoard.id) && setSelectedBoard(null)}>Delete Board</GeneralButton>
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
        onClose={() => setEditModalOpen(false)}
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