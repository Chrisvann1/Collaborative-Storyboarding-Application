import styles from "./UpdateProjectModal.module.css";

export default function UpdateProjectModal({ message, open, onClose, updateProject, setUpdatedProject, onSubmit}) {
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
          value={updateProject.title ?? ""}
          onChange={(e) => setUpdatedProject({ ...updateProject, title: e.target.value })}
        />

        {/* Description */}
        <textarea
          placeholder="Description"
          value={updateProject.description ?? ""}
          onChange={(e) => setUpdatedProject({ ...updateProject, description: e.target.value })}
        />

        <button
          onClick={(e) => {
            e.preventDefault();
            if (!updateProject?.id) return;
            onSubmit(updateProject.id, {
              title: updateProject.title,
              description: updateProject.description
            });
          }}
        >
          Submit
        </button>
        
        <button className={styles.close_modal} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
