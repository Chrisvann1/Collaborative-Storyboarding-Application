import styles from "./styles/Modal.module.css";

/*==================== Create Project Modal Component ==================== */
/**
 * CreateProjectModal Component
 *
 * A modal used to create a new project. Collects basic project
 * information such as title and description and provides actions to
 * submit or cancel the creation process.
 *
 * Props:
 * - message     : Heading text displayed at the top of the modal.
 * - open        : Boolean controlling modal visibility; when false, the modal is not rendered.
 * - onClose     : Function invoked when the modal should be closed (clicking the overlay, close icon, or "Cancel" button).
 * - newProject  : Object representing the new project data, including:
 *                 - title (required)
 *                 - description 
 * - setNewProject : State setter function used to update the `newProject` object
 * - onSubmit    : Function triggered when the "Create Project" button is clicked.
 *
 * Behavior:
 * - The modal does not render if `open` is false.
 * - The "Create Project" button is disabled until a non-empty title is provided.
 *
 * Styling:
 * - Uses shared modal styles from `Modal.module.css`.
 */


export default function CreateProjectModal({ message, open, onClose, newProject, setNewProject, onSubmit}) {
  if (!open) return null;

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
          
          {/* Project Information Section */}
          <div className={styles.form_section_large}>
            <h3 className={styles.section_title}>Project Details</h3>
            
            <div className={styles.form_group_large}>
              <label htmlFor="title" className={styles.form_label}>
                Title <span className={styles.required}>*</span>
              </label>
              <input
                id="title"
                type="text"
                placeholder="Enter project title"
                value={newProject.title ?? ""}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                className={`${styles.form_input} ${styles.form_input_large}`}
                required
              />
            </div>

            <div className={styles.form_group_large}>
              <label htmlFor="description" className={styles.form_label}>
                Description
              </label>
              <textarea
                id="description"
                placeholder="Describe your project..."
                value={newProject.description ?? ""}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className={`${styles.form_input} ${styles.textarea} ${styles.textarea_large}`}
                rows={5}
              />
            </div>
          </div>
          
        </div>

        {/* Footer - Actions*/}
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
            disabled={!newProject.title?.trim()}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}