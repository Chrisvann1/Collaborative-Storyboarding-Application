import styles from "./AddModal.module.css";
import { supabase } from "../supabase-client"; 

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

  // Handle image deletion
  async function handleImageDelete() {
    if (!newBoard.image_url) return;

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
        <h2>{message}</h2>

        {/*Image Upload
        The star on image indicates any type of image file
        onChange - handler that runs whenever a user selects or changes a file*/}
        <label>Add Image</label>
        <input type="file" accept="image/*" onChange={handleImageUpload}/>

        {/*Image Preview*/}
        {newBoard.image_url && (
          <div className={styles.image_preview_container}>
            <img
              src={newBoard.image_url}
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
          placeholder="Title (REQUIRED)"
          //Double question mark - If newBoard.title is null or undefined, use an empty string
          value={newBoard.title ?? ""}
          onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
        />

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