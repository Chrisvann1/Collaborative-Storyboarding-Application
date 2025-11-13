import styles from "./AddModal.module.css";
import { supabase } from "../supabase-client"; 

//Uses props for opening, closing, and providing a message
//The values passed in for creating a new board can be found in EditProject.jsx
//If !open - do not return anything from this function meaning the modal is closed 
//Clicking on Overlay or the close button closes the Modal (overlay being everything that's not in the modal)
//Close button also closes it
//div (division)- basic container in HTML
  //Block level container - an element that starts on a new line and takes full available width
//onClose sets Open to false in EditProject.jsx
// Modal.jsx

export default function Modal({ message, open, onClose, newBoard, setNewBoard, onSubmit }) {
  if (!open) return null;

  //Image upload handle function 
async function handleImageUpload(e) {
  const file = e.target.files[0]; 
  if (!file) return; 

  const safeName = file.name
    //Replace spaces with
    .replace(/\s+/g, "_") 
    //Removes other invalid characters
    .replace(/[^a-zA-Z0-9._-]/g, ""); 

  // Unique name for the image
  const fileName = `${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("images")
    .upload(fileName, file);

  if (error) {
    console.error("Image upload failed:", error);
    alert("Upload failed");
    return;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("images")
    .getPublicUrl(fileName);

  // Add image_url to the new board
  setNewBoard({ ...newBoard, image_url: urlData.publicUrl });
}

  return (
    <div className={styles.modal}>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.modal_content}>
        <h2>{message}</h2>

        {/*Image Upload
        The star on image indicates any type of image file
        onChange - handler that runs whenever a user selects or changes a file*/}
        <label>Add Image</label>
        <input type="file" accept="image/*" onChange={handleImageUpload}/>

        {/*Image Preview*/}
        {newBoard.image_url && (
          <img
            src={newBoard.image_url}
            alt="Preview"
            style={{ marginTop: "10px", maxWidth: "10%", height: "auto", maxHeight: "10%", borderRadius: "5px" }}
          />
        )}

        {/* Title */}
        <input
          type="text"
          placeholder="Title (REQUIRED)"
          //Double question mark - If newBoard.title is null or undefined, use an empty string
          value={newBoard.title ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
        />

        {/* Scene - Add back later if there is time
        <input
          type="number"
          placeholder="Scene (REQUIRED)"
          //If newBoard.scene is null or undefined, return an empty string
          value={newBoard.scene ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, scene: e.target.value })}
        />

        */}

        {/* Shot */}
        <input
          type="number"
          placeholder="Shot (REQUIRED)"
          value={newBoard.shot ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, shot: e.target.value })}
        />

        {/* Description */}
        <textarea
          placeholder="Description"
          value={newBoard.description ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
        />

        {/* Duration */}
        <input
          type="number"
          placeholder="Duration"
          value={newBoard.duration ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, duration: e.target.value })}
        />

        {/* Transition */}
        <select
          value={newBoard.transition ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, transition: e.target.value })}
        >
          <option value="">Select Transition</option>
          <option value="cut">Cut</option>
          <option value="fade">Fade</option>
          <option value="dissolve">Dissolve</option>
          <option value="wipe">Wipe</option>
        </select>

        {/* Aspect Ratio */}
        <select
          value={newBoard.aspect_ratio ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, aspect_ratio: e.target.value })}
        >
          <option value="">Aspect Ratio</option>
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="21:9">21:9</option>
        </select>

        {/* Camera Angle */}
        <select
          value={newBoard.camera_angle ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, camera_angle: e.target.value })}
        >
          <option value="">Camera Angle</option>
          <option value="eye-level">Eye-level</option>
          <option value="high-angle">High Angle</option>
          <option value="low-angle">Low Angle</option>
          <option value="over-the-shoulder">Over the Shoulder</option>
        </select>

        {/* Camera Movement */}
        <select
          value={newBoard.camera_movement ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, camera_movement: e.target.value })}
        >
          <option value="">Camera Movement</option>
          <option value="static">Static</option>
          <option value="pan">Pan</option>
          <option value="tilt">Tilt</option>
          <option value="dolly">Dolly</option>
          <option value="zoom">Zoom</option>
        </select>

        {/* Lens */}
        <select
          value={newBoard.lens_focal_mm ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, lens_focal_mm: e.target.value })}
        >
          <option value="">Lens (mm)</option>
          <option value="18mm">18mm</option>
          <option value="35mm">35mm</option>
          <option value="50mm">50mm</option>
          <option value="85mm">85mm</option>
          <option value="135mm">135mm</option>
        </select>

        {/* Actions */}
        <button onClick={onSubmit}>Submit</button>
        <button className={styles.close_modal} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}