import styles from "./CreateProjectModal.module.css";

export default function CreateProjectModal({ message, open, onClose, newProject, setNewProject, onSubmit}) {
  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.overlay} onClick={onClose}></div>
      <div className={styles.modal_content}>
        <h2>{message}</h2>

        {/* Title */}
        <input
          type="text"
          placeholder="Title (REQUIRED)"
          value={newProject.title ?? ""}
          onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
        />

        {/* Description */}
        <textarea
          placeholder="Description"
          value={newProject.description ?? ""}
          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
        />

        <button onClick={onSubmit}>Submit</button>
        <button className={styles.close_modal} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
