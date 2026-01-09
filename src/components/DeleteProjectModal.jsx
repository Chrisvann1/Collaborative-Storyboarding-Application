import styles from './styles/Modal.module.css';

/**
 * DeleteProjectModal
 *
 * A confirmation modal shown when a user attempts to delete a project.
 * Requires explicit confirmation due to the destructive nature of the action.
 *
 * Props:
 * - open (boolean):
 *   Controls modal visibility.
 *
 * - onCancel (function):
 *   Closes the modal without performing deletion.
 *
 * - onConfirm (function):
 *   Executes project deletion logic.
 */
export default function DeleteProjectModal({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className={styles.delete_modal_overlay}>
      
      <div className={styles.delete_modal_content}>

        <h2>Delete Project</h2>

        <p>
          Are you sure you want to delete this project? This action cannot be undone.
        </p>

        <div className={styles.delete_modal_actions}>
          
          <button
            className={styles.delete_cancel_btn}
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className={styles.delete_confirm_btn}
            onClick={onConfirm}
          >
            Delete
          </button>

        </div>
      </div>
    </div>
  );
}
