import styles from "./styles/Modal.module.css";
import { supabase } from "../supabase-client"; 
import { useState } from "react";

/*==================== Add Board Modal Component ==================== */
/**
 * Modal Component
 *
 * A modal dialog used to create a new storyboard shot with visuals, metadata, 
 * and technical details. Supports image upload via Supabase Storage.
 *
 * message      - The heading displayed at the top of the modal.
 * open         - Boolean controlling modal visibility; true shows the modal, false hides it.
 * onClose      - Function invoked when the modal should be closed (clicking overlay or "Cancel").
 * newBoard     - Object representing the new shot's data, including:
 *                  title, description, duration, image_url, transition, aspect_ratio,
 *                  camera_angle, camera_movement, lens_focal_mm.
 * setNewBoard  - Function to update the `newBoard` state when inputs change.
 * onSubmit     - Function triggered when the "Create Shot" button is clicked.
 * 
 * Styling: 
 * - Utilizes CSS modules for styling (Modal.module.css).
 */
export default function Modal({ message, open, onClose, newBoard, setNewBoard, onSubmit}) {
  const [isUploading, setIsUploading] = useState(false);
  
  if (!open) return null;

  // Image Upload Function
  async function handleImageUpload(e) {
    const file = e.target.files[0]; 
    if (!file) return; 

    setIsUploading(true);
    
    try {
      const safeName = file.name
        .replace(/\s+/g, "_") 
        .replace(/[^a-zA-Z0-9._-]/g, ""); 

      const fileName = `${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(fileName, file);

      if (error) {
        console.error("Image upload failed:", error);
        alert("Upload failed. Please try again.");
        return;
      }

      // Get public URL from Supabase Storage
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      // Add image_url to the new board
      setNewBoard({ ...newBoard, image_url: urlData.publicUrl });
    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  }

  // Handle image deletion
  async function handleImageDelete() {
    if (!newBoard.image_url) return;

    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      // Extract filename from URL
      const urlParts = newBoard.image_url.split('/');
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
      setNewBoard({ ...newBoard, image_url: null });
      
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Error deleting image");
    }
  }

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
                {newBoard.image_url ? (
                  <>
                    <img
                      src={newBoard.image_url}
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
            * 
            * - Title (required)
            * - Duration 
            * - Description
            *
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
                  placeholder="Enter shot title"
                  value={newBoard.title ?? ""}
                  onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
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
                  value={newBoard.duration ?? ""}
                  onChange={(e) => setNewBoard({ ...newBoard, duration: e.target.value })}
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
                placeholder="Describe the shot..."
                value={newBoard.description ?? ""}
                onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                className={`${styles.form_input} ${styles.textarea}`}
                rows={3}
              />
            </div>
          </div>

          {/* 
            * Section 3: Technical Details 
            *
            * - Transition
            * - Aspect Ratio
            * - Camera Angle
            * - Camera Movement
            * - Lens Focal Length
            * 
            * 
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
                  value={newBoard.transition ?? ""}
                  onChange={(e) => setNewBoard({ ...newBoard, transition: e.target.value })}
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
                  value={newBoard.aspect_ratio ?? ""}
                  onChange={(e) => setNewBoard({ ...newBoard, aspect_ratio: e.target.value })}
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
                  value={newBoard.camera_angle ?? ""}
                  onChange={(e) => setNewBoard({ ...newBoard, camera_angle: e.target.value })}
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
                  value={newBoard.camera_movement ?? ""}
                  onChange={(e) => setNewBoard({ ...newBoard, camera_movement: e.target.value })}
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
                  value={newBoard.lens_focal_mm ?? ""}
                  onChange={(e) => setNewBoard({ ...newBoard, lens_focal_mm: e.target.value })}
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

        {/* Section 4: Footer - Actions */}
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
            onClick={onSubmit}
            type="button"
            disabled={!newBoard.title?.trim()}
          >
            Create Shot
          </button>
        </div>
      </div>
    </div>
  );
}