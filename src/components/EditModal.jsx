import styles from "./EditModal.module.css"
import { supabase } from "../supabase-client.js";
import { useRef } from "react"

export default function Modal({ message, open, onClose, selectedBoard, setSelectedBoard, onSubmit, onAutoSave}) {
  if (!open || !selectedBoard) return null;

  // Wrapper to handle type conversion and submission
  const handleSubmit = () => {
    // Convert number fields before sending
    const updated = {
      ...selectedBoard,
      scene: selectedBoard.scene !== "" ? Number(selectedBoard.scene) : null,
      shot: selectedBoard.shot !== "" ? Number(selectedBoard.shot) : null,
      duration: selectedBoard.duration !== "" ? Number(selectedBoard.duration) : null,
      lens_focal_mm: selectedBoard.lens_focal_mm?.replace("mm", "") 
        ? Number(selectedBoard.lens_focal_mm.replace("mm", "")) 
        : null
    };
    // Call parent submit function
    onSubmit(selectedBoard.id, updated);
    // Close modal
    onClose();
  };

  // Handle image upload
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Sanitize file name
  const safeName = file.name
    .replace(/\s+/g, "_")          // replace spaces with _
    .replace(/[^a-zA-Z0-9._-]/g, ""); // remove any other invalid chars

  const fileName = `${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("images")
    .upload(fileName, file);

  if (error) {
    console.error("Image upload failed:", error);
    alert("Upload failed");
    return;
  }

  const { data: urlData } = supabase.storage
    .from("images")
    .getPublicUrl(fileName);

  setSelectedBoard({ ...selectedBoard, image_url: urlData.publicUrl });
}


//useRef saves variable value between renders
//Meaning a re-render will not cause the value to reset
//useRef instead of useState because useState causes re-renders, leading to hundreds 
//of unnessecary re-renders
const saveTimer = useRef(null);

//If the user stops updating/typing for 350ms, then onSubmit is called which updates the database 
async function debouncedSave(updatedBoard) {
  //Clears any existing timer so it doesn't trigger a save
  //This would cause a save on every change after 350ms if the timer 
  //was not cleared
  if (saveTimer.current) clearTimeout(saveTimer.current);

  // Start a new timer, once 350ms, use onSubmit
  saveTimer.current = setTimeout(async () => {
    console.log("Saving to database...");

    //Call the parent submit function which updates the database
    onAutoSave(updatedBoard);
  }, 350);
}


  return (
    <div className={styles.modal}>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.modal_content}>
        <h2>{message}</h2>

      {/* Image Upload */}
      <label>Add Image</label>
      <input type="file" accept="image/*" onChange={handleImageUpload} />

      {/* Image Preview */}
      {selectedBoard.image_url && (
        <img
          src={selectedBoard.image_url}
          alt="Preview"
          style={{ marginTop: "10px", maxWidth: "10%", height: "auto", maxHeight: "10%", borderRadius: "5px" }}
        />
      )}

        {/* Title */}
        <input
          type="text"
          //Double question mark - If selectedBoard.title is null or undefined, use an empty string
          value={selectedBoard.title ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, title: e.target.value }; // full updated board
            setSelectedBoard(updated); // update local state
            debouncedSave(updated);    // trigger debounced save
          }}
        />

        {/* Shot */}
        <input
          type="number"
          value={selectedBoard.shot ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, shot: e.target.value }; 
            setSelectedBoard(updated); 
            debouncedSave(updated);   
          }}
        />

        {/* Description */}
        <textarea
          value={selectedBoard.description ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, description: e.target.value }; 
            setSelectedBoard(updated); 
            debouncedSave(updated);    
          }}
        />

        {/* Duration */}
        <input
          type="number"
          value={selectedBoard.duration ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, duration: e.target.value }; 
            setSelectedBoard(updated); 
            debouncedSave(updated);    
          }}
        />

        {/* Transition */}
        <select
          value={selectedBoard.transition ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, transition: e.target.value }; 
            setSelectedBoard(updated); 
            debouncedSave(updated);    
          }}
        >
          <option value="">Select Transition</option>
          <option value="cut">Cut</option>
          <option value="fade">Fade</option>
          <option value="dissolve">Dissolve</option>
          <option value="wipe">Wipe</option>
        </select>

        {/* Aspect Ratio */}
        <select
          value={selectedBoard.aspect_ratio ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, aspect_ratio: e.target.value }; 
            setSelectedBoard(updated); 
            debouncedSave(updated);    
          }}
        >
          <option value="">Aspect Ratio</option>
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="21:9">21:9</option>
        </select>

        {/* Camera Angle */}
        <select
          value={selectedBoard.camera_angle ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, camera_angle: e.target.value }; 
            setSelectedBoard(updated); 
            debouncedSave(updated);    
          }}
        >
          <option value="">Camera Angle</option>
          <option value="eye-level">Eye-level</option>
          <option value="high-angle">High Angle</option>
          <option value="low-angle">Low Angle</option>
          <option value="over-the-shoulder">Over the Shoulder</option>
        </select>

        {/* Camera Movement */}
        <select
          value={selectedBoard.camera_movement ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, camera_movement: e.target.value }; 
            setSelectedBoard(updated); 
            debouncedSave(updated);    
          }}
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
          value={selectedBoard.lens_focal_mm ?? ""}
          onChange={(e) => {
            const updated = { ...selectedBoard, lens_focal_mm: e.target.value }; 
            setSelectedBoard(updated); 
            debouncedSave(updated);    
          }}
        >
          <option value="">Lens (mm)</option>
          <option value="18mm">18mm</option>
          <option value="35mm">35mm</option>
          <option value="50mm">50mm</option>
          <option value="85mm">85mm</option>
          <option value="135mm">135mm</option>
        </select>

        {/* Actions */}
        <button onClick={handleSubmit}>Submit</button>
        <button className={styles.close_modal} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
