import styles from './styles/Modal.module.css'; 

/**
 * DeleteBoardModal
 *
 * A confirmation modal used when a user attempts to delete a board.
 * The modal blocks interaction with the rest of the UI and requires
 * the user to explicitly confirm or cancel the destructive action.
 *
 * Props:
 * - open (boolean):
 *   Controls whether the modal is visible. When false, the component
 *   returns null and renders nothing.
 *
 * - onCancel (function):
 *   Callback invoked when the user clicks "Cancel".
 *   Typically used to close the modal without taking action.
 *
 * - onConfirm (function):
 *   Callback invoked when the user clicks "Delete".
 *   This should trigger the actual board deletion logic.
 */
export default function DeleteBoardModal({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    // Full-screen overlay that darkens the background
    <div className={styles.delete_modal_overlay}>
      
      <div className={styles.delete_modal_content}>

        <h2>Delete Board</h2>

        <p>
          Are you sure you want to delete this board? This action cannot be undone.
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
