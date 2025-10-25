import styles from "./EditModal.module.css"

export default function Modal({ message, open, onClose, selectedBoard, setSelectedBoard, onSubmit }) {
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

  return (
    <div className={styles.modal}>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.modal_content}>
        <h2>{message}</h2>

        {/* Title */}
        <input
          type="text"
          //Double question mark - If selectedBoard.title is null or undefined, use an empty string
          value={selectedBoard.title ?? ""}
          onChange={(e) => setSelectedBoard({ ...selectedBoard, title: e.target.value })}
        />

        {/* Scene - Add back later if time
        <input
          type="number"
          //If selectedBoard.scene is null or undefined, return an empty string
          value={selectedBoard.scene ?? ""}
          onChange={(e) => setSelectedBoard({ ...selectedBoard, scene: e.target.value })}
        />

        */}

        {/* Shot */}
        <input
          type="number"
          value={selectedBoard.shot ?? ""}
          onChange={(e) => setSelectedBoard({ ...selectedBoard, shot: e.target.value })}
        />

        {/* Description */}
        <textarea
          value={selectedBoard.description ?? ""}
          onChange={(e) => setSelectedBoard({ ...selectedBoard, description: e.target.value })}
        />

        {/* Duration */}
        <input
          type="number"
          value={selectedBoard.duration ?? ""}
          onChange={(e) => setSelectedBoard({ ...selectedBoard, duration: e.target.value })}
        />

        {/* Transition */}
        <select
          value={selectedBoard.transition ?? ""}
          onChange={(e) => setSelectedBoard({ ...selectedBoard, transition: e.target.value })}
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
          onChange={(e) => setSelectedBoard({ ...selectedBoard, aspect_ratio: e.target.value })}
        >
          <option value="">Aspect Ratio</option>
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="21:9">21:9</option>
        </select>

        {/* Camera Angle */}
        <select
          value={selectedBoard.camera_angle ?? ""}
          onChange={(e) => setSelectedBoard({ ...selectedBoard, camera_angle: e.target.value })}
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
          onChange={(e) => setSelectedBoard({ ...selectedBoard, camera_movement: e.target.value })}
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
          onChange={(e) => setSelectedBoard({ ...selectedBoard, lens_focal_mm: e.target.value })}
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
