import styles from "./EditModal.module.css"
import { supabase } from "../supabase-client.js";
import { useRef, useState, useEffect } from "react"

export default function Modal({ message, open, onClose, selectedBoard, setSelectedBoard, onSubmit, onAutoSave}) {
  if (!open || !selectedBoard) return null;

// Local UI variables for the board currently being edited.
// This state is used immediate feedback so the UI updates instantly
// as the user types rather than relying 
// strictly on the database updates
const [displayBoard, setDisplayBoard] = useState(selectedBoard);

// Ref used to store the active debounce timer ID.
// Because timers must persist across renders without triggering re-renders,
// a ref is the correct storage location.
const saveTimeoutRef = useRef(null);

// Ref that always holds the MOST RECENT version of the board.
// This prevents stale closure issues inside the debounced setTimeout callback,
// ensuring auto-save always reads the latest state.
const latestDisplayBoardRef = useRef(selectedBoard);

/*
 * 
 * The 2nd line allows for fast UI updates that happen locally while typing
 * 
 * The 3rd line is neseccary to save data locally if there is a change to 
 * selectedBoard during the 300ms or from database latency (to prevent lag
 * or cut off data)
*/
useEffect(() => {
  setDisplayBoard(selectedBoard);                 
  latestDisplayBoardRef.current = selectedBoard; 
}, [selectedBoard]);


/**
 * Debounced field change handler.
 *
 * Responsibilities:
 * 1. Instantly update UI for responsive typing.
 * 2. Keep latestDisplayBoardRef synchronized for auto-save reliability.
 * 3. Sync changes to parent state.
 * 4. Debounce saves so the database is not spammed.
 * 5. Save the ENTIRE board object as a single atomic update.
 */
const handleFieldChange = (field, value) => {
  // Create a new board object with the updated field.
  // This preserves immutability and triggers React re-render correctly.
  const updatedDisplayBoard = { ...displayBoard, [field]: value };

  // Immediate UI update so user sees their input with zero latency.
  setDisplayBoard(updatedDisplayBoard);

  // Update the ref so the debounced save always uses the latest data,
  // even if additional renders occur before the timeout fires.
  latestDisplayBoardRef.current = updatedDisplayBoard;
  
  // Keep the parent component synchronized with the local UI state.
  setSelectedBoard(updatedDisplayBoard);
  
  // Clear any previously scheduled save.
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  
  // Schedule a new debounced save.
  saveTimeoutRef.current = setTimeout(() => {
    // Read the most current board safely from the ref.
    const currentBoard = latestDisplayBoardRef.current;
    
    const processedBoard = {
      ...currentBoard,
      shot: currentBoard.shot !== "" ? Number(currentBoard.shot) : null,
      duration: currentBoard.duration !== "" ? Number(currentBoard.duration) : null,
      lens_focal_mm: currentBoard.lens_focal_mm?.replace("mm", "") 
        ? Number(currentBoard.lens_focal_mm.replace("mm", "")) 
        : null
    };
    
    // Persist the ENTIRE current state of the board.
    // Saving the full object prevents partial overwrites and race conditions.
    onAutoSave(processedBoard);
  }, 300); // Short delay to capture rapid typing while minimizing server load
};

  // Handle image upload
  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const safeName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

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

    handleFieldChange('image_url', urlData.publicUrl);
  }

  // Handle image deletion
  async function handleImageDelete() {
    if (!displayBoard.image_url) return;

    try {
      // Extract filename from URL
      const urlParts = displayBoard.image_url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error } = await supabase.storage
        .from("images")
        .remove([fileName]);

      if (error) {
        console.error("Image deletion failed:", error);
        alert("Failed to delete image");
        return;
      }

      // Update state to remove image URL
      handleFieldChange('image_url', null);
      
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Error deleting image");
    }
  }

  // Wrapper to handle type conversion and submission
  const handleSubmit = () => {
    const updated = {
      ...displayBoard,
      shot: displayBoard.shot !== "" ? Number(displayBoard.shot) : null,
      duration: displayBoard.duration !== "" ? Number(displayBoard.duration) : null,
      lens_focal_mm: displayBoard.lens_focal_mm?.replace("mm", "") 
        ? Number(displayBoard.lens_focal_mm.replace("mm", "")) 
        : null
    };
    onSubmit(selectedBoard.id, updated);
    onClose();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.modal}>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.modal_content}>
        <h2>{message}</h2>

        <label>Add Image</label>
        <input type="file" accept="image/*" onChange={handleImageUpload} />

        {displayBoard.image_url && (
          <div className={styles.image_preview_container}>
            <img
              src={displayBoard.image_url}
              alt="Preview"
              className={styles.image_preview}
            />
            <button 
              type="button"
              onClick={handleImageDelete}
              className={styles.delete_image_btn}
            >
              Delete Image
            </button>
          </div>
        )}

        {/* Title */}
        <input
          type="text"
          value={displayBoard.title ?? ""}
          onChange={(e) => handleFieldChange('title', e.target.value)}
        />

        {/* Shot */}
        <input
          type="number"
          value={displayBoard.shot ?? ""}
          onChange={(e) => handleFieldChange('shot', e.target.value)}
        />

        {/* Description */}
        <textarea
          value={displayBoard.description ?? ""}
          onChange={(e) => handleFieldChange('description', e.target.value)}
        />

        {/* Duration */}
        <input
          type="number"
          value={displayBoard.duration ?? ""}
          onChange={(e) => handleFieldChange('duration', e.target.value)}
        />

        {/* Transition */}
        <select
          value={displayBoard.transition ?? ""}
          onChange={(e) => handleFieldChange('transition', e.target.value)}
        >
          <option value="">Select Transition</option>
          <option value="cut">Cut</option>
          <option value="fade">Fade</option>
          <option value="dissolve">Dissolve</option>
          <option value="wipe">Wipe</option>
        </select>

        {/* Aspect Ratio */}
        <select
          value={displayBoard.aspect_ratio ?? ""}
          onChange={(e) => handleFieldChange('aspect_ratio', e.target.value)}
        >
          <option value="">Aspect Ratio</option>
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="21:9">21:9</option>
        </select>

        {/* Camera Angle */}
        <select
          value={displayBoard.camera_angle ?? ""}
          onChange={(e) => handleFieldChange('camera_angle', e.target.value)}
        >
          <option value="">Camera Angle</option>
          <option value="eye-level">Eye-level</option>
          <option value="high-angle">High Angle</option>
          <option value="low-angle">Low Angle</option>
          <option value="over-the-shoulder">Over the Shoulder</option>
        </select>

        {/* Camera Movement */}
        <select
          value={displayBoard.camera_movement ?? ""}
          onChange={(e) => handleFieldChange('camera_movement', e.target.value)}
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
          value={displayBoard.lens_focal_mm ?? ""}
          onChange={(e) => handleFieldChange('lens_focal_mm', e.target.value)}
        >
          <option value="">Lens (mm)</option>
          <option value="18mm">18mm</option>
          <option value="35mm">35mm</option>
          <option value="50mm">50mm</option>
          <option value="85mm">85mm</option>
          <option value="135mm">135mm</option>
        </select>

        <button onClick={handleSubmit}>Submit</button>
        <button className={styles.close_modal} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}