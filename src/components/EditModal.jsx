import styles from "./styles/Modal.module.css";
import { supabase } from "../supabase-client.js";
import { useRef, useState, useEffect } from "react"

/*======================================================================================*/
/*======EDIT BOARD MODAL COMPONENT======================================================*/
/*======================================================================================*/

/*
* This component renders a modal interface for editing a single board (scene)
 * within a project. It allows users to update image, shot details,
 * and technical specifications, while providing instant UI feedback and
 * debounced auto-save functionality
 *
 * Key Features:
 * - Local state to mirror the selected board for immediate UI updates while typing.
 * - Debounced auto-save ensures the database is updated shortly after the user stops typing.
 * - Handles image upload, replacement, and deletion through Supabase Storage.
 * - Keeps parent state synchronized with local changes to maintain consistent UI.
 * - Cleans up timers when the modal is removed from the UI to prevent memory leaks.
 *
 * Props:
 * - message: Header text for the modal.
 * - open: Controls whether the modal is visible.
 * - onClose: Callback to close the modal.
 * - selectedBoard: The board currently being edited.
 * - setSelectedBoard: Function to update the selected board in parent state.
 * - onSubmit: Callback for submitting final changes.
 * - onAutoSave: Callback for automatically saving intermediate changes.
 *
 * Notes:
 * - Numeric fields like duration and lens focal length are converted before saving.
 * - Shot number is not updated here to avoid conflicts with drag-and-drop ordering.
 * - Auto-save timeout is tracked and cleared on unmount.
 * - Uploaded filenames are sanitized and stored in Supabase Storage.
*/
export default function Modal({ message, open, onClose, selectedBoard, setSelectedBoard, onSubmit, onAutoSave}) {
  if (!open || !selectedBoard) return null;


  // Local UI variables for the board currently being edited.
  const [displayBoard, setDisplayBoard] = useState(selectedBoard);
  const [isUploading, setIsUploading] = useState(false);

  // Ref used to store the active debounce timer ID (allows timer existence across renders without triggering re-renders).
  const saveTimeoutRef = useRef(null);

  // Ref that always holds the MOST RECENT version of the board, ensures auto-save reads the latest state.
  const latestDisplayBoardRef = useRef(selectedBoard);

  /* * Sync displayBoard with selectedBoard prop changes.`
   * - The 2nd line allows for fast UI updates that happen locally while typing
   * - The 3rd line is neseccary to save data locally if there is a change to 
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
   * 5. Save the ENTIRE board object as a single atomic update (excluding shot).
   */
  const handleFieldChange = (field, value) => {
    // Create a new board object with the updated field.
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

      // Exclude shot from the update so only drag-and-drop can change it
      const { shot, ...rest } = currentBoard;
      
      const processedBoard = {
        ...rest,
        duration: rest.duration !== "" ? Number(rest.duration) : null,
        lens_focal_mm: rest.lens_focal_mm?.replace("mm", "") 
          ? Number(rest.lens_focal_mm.replace("mm", "")) 
          : null
      };
      
      // Persist the current state of the board without updating shot.
      onAutoSave(processedBoard);
    }, 300);
  };


  // Handle image upload
  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    
    const safeName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const fileName = `${Date.now()}-${safeName}`;

    try {
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
    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  }

  // Handle image deletion
  async function handleImageDelete() {
    if (!displayBoard.image_url) return;

    if (!confirm("Are you sure you want to delete this image?")) return;

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
    // Destructure shot out of the board to avoid updating it here
    const { shot, ...rest } = displayBoard;

    // Convert numeric fields
    const updated = {
      ...rest,
      duration: rest.duration !== "" ? Number(rest.duration) : null,
      lens_focal_mm: rest.lens_focal_mm?.replace("mm", "")
        ? Number(rest.lens_focal_mm.replace("mm", ""))
        : null
    };

    onSubmit(selectedBoard.id, updated);
    onClose();
  };

  // Clear timeout when Modal is removed from UI
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
        
        {/* Header */}
        <div className={styles.modal_header}>
          <h2 className={styles.modal_title}>{message}</h2>
          <button className={styles.close_modal} onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Form Content */}
        <div className={styles.modal_body}>
          
          {/* Section 1: Image Upload */}
          <div className={styles.form_section}>
            <h3 className={styles.section_title}>Visuals</h3>
            
            <div className={styles.image_upload_area}>
              <div className={styles.image_preview_container}>
                {displayBoard.image_url ? (
                  <>
                    <img
                      src={displayBoard.image_url}
                      alt="Preview"
                      className={styles.image_preview}
                    />
                    <div className={styles.image_actions}>
                      <button 
                        type="button"
                        onClick={handleImageDelete}
                        className={styles.delete_image_btn}
                      >
                        Delete Image
                      </button>
                      <label className={styles.replace_image_btn}>
                        Replace
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          className={styles.hidden_input}
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <div className={styles.upload_placeholder}>
                    <label className={styles.upload_area}>
                      <span className={styles.upload_icon}>📷</span>
                      <span className={styles.upload_text}>Upload Image</span>
                      <span className={styles.upload_subtext}>Click to browse images</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className={styles.hidden_input}
                        disabled={isUploading}
                      />
                    </label>
                    {isUploading && (
                      <div className={styles.uploading_indicator}>
                        Uploading...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Basic Info 
           * - fields: title, duration, description
           */}
          <div className={styles.form_section}>
            <h3 className={styles.section_title}>Scene Information</h3>
            <div className={styles.form_grid}>
              <div className={styles.form_group}>
                <label htmlFor="title" className={styles.form_label}>
                  Title <span className={styles.required}>*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter scene title"
                  value={displayBoard.title ?? ""}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className={styles.form_input}
                  required
                />
              </div>

              <div className={styles.form_group}>
                <label htmlFor="duration" className={styles.form_label}>
                  Duration (seconds)
                </label>
                <input
                  id="duration"
                  type="number"
                  placeholder="e.g., 5"
                  min="0"
                  step="0.1"
                  value={displayBoard.duration ?? ""}
                  onChange={(e) => handleFieldChange('duration', e.target.value)}
                  className={styles.form_input}
                />
              </div>
            </div>

            <div className={styles.form_group}>
              <label htmlFor="description" className={styles.form_label}>
                Description
              </label>
              <textarea
                id="description"
                placeholder="Describe the scene..."
                value={displayBoard.description ?? ""}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className={`${styles.form_input} ${styles.textarea}`}
                rows={3}
              />
            </div>
          </div>

          {/* Section 3: Technical Details 
            * - fields: transition, aspect_ratio, camera_angle, camera_movement, lens_focal_mm
            */}
          <div className={styles.form_section}>
            <h3 className={styles.section_title}>Technical Details</h3>
            <div className={styles.form_grid}>
              
              <div className={styles.form_group}>
                <label htmlFor="transition" className={styles.form_label}>
                  Transition
                </label>
                <select
                  id="transition"
                  value={displayBoard.transition ?? ""}
                  onChange={(e) => handleFieldChange('transition', e.target.value)}
                  className={styles.form_select}
                >
                  <option value="">Select Transition</option>
                  <option value="cut">Cut</option>
                  <option value="fade">Fade</option>
                  <option value="dissolve">Dissolve</option>
                  <option value="wipe">Wipe</option>
                </select>
              </div>

              <div className={styles.form_group}>
                <label htmlFor="aspect_ratio" className={styles.form_label}>
                  Aspect Ratio
                </label>
                <select
                  id="aspect_ratio"
                  value={displayBoard.aspect_ratio ?? ""}
                  onChange={(e) => handleFieldChange('aspect_ratio', e.target.value)}
                  className={styles.form_select}
                >
                  <option value="">Aspect Ratio</option>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="21:9">21:9</option>
                </select>
              </div>

              <div className={styles.form_group}>
                <label htmlFor="camera_angle" className={styles.form_label}>
                  Camera Angle
                </label>
                <select
                  id="camera_angle"
                  value={displayBoard.camera_angle ?? ""}
                  onChange={(e) => handleFieldChange('camera_angle', e.target.value)}
                  className={styles.form_select}
                >
                  <option value="">Camera Angle</option>
                  <option value="eye-level">Eye-level</option>
                  <option value="high-angle">High Angle</option>
                  <option value="low-angle">Low Angle</option>
                  <option value="over-the-shoulder">Over the Shoulder</option>
                </select>
              </div>

              <div className={styles.form_group}>
                <label htmlFor="camera_movement" className={styles.form_label}>
                  Camera Movement
                </label>
                <select
                  id="camera_movement"
                  value={displayBoard.camera_movement ?? ""}
                  onChange={(e) => handleFieldChange('camera_movement', e.target.value)}
                  className={styles.form_select}
                >
                  <option value="">Camera Movement</option>
                  <option value="static">Static</option>
                  <option value="pan">Pan</option>
                  <option value="tilt">Tilt</option>
                  <option value="dolly">Dolly</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>

              <div className={styles.form_group}>
                <label htmlFor="lens" className={styles.form_label}>
                  Lens Focal Length
                </label>
                <select
                  id="lens"
                  value={displayBoard.lens_focal_mm ?? ""}
                  onChange={(e) => handleFieldChange('lens_focal_mm', e.target.value)}
                  className={styles.form_select}
                >
                  <option value="">Lens (mm)</option>
                  <option value="18mm">18mm</option>
                  <option value="35mm">35mm</option>
                  <option value="50mm">50mm</option>
                  <option value="70mm">70mm</option>
                  <option value="85mm">85mm</option>
                  <option value="135mm">135mm</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className={styles.modal_footer}>
          <button 
            className={styles.secondary_button}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          <button 
            className={styles.primary_button}
            onClick={handleSubmit}
            type="button"
            disabled={!displayBoard.title?.trim()}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}