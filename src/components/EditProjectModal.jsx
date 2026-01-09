import styles from "./styles/Modal.module.css";
import { supabase } from "../supabase-client.js";
import { useRef, useState, useEffect } from "react";

/*======================================================================================*/
/*======EDIT PROJECT MODAL COMPONENT====================================================*/
/*======================================================================================*/

/*
* This component renders a modal interface for editing a single project.
* It allows users to update project details like title and description,
* while providing instant UI feedback and debounced auto-save functionality.
*
* Key Features:
* - Local state mirrors the project being edited for immediate UI updates while typing.
* - Debounced auto-save ensures the database is updated shortly after the user stops typing.
* - Keeps parent state synchronized with local changes to maintain consistent UI.
* - Detects external changes from other users via Supabase real-time channels.
* - Cleans up timers and subscriptions when the modal is removed from the UI.
*
* Props:
* - message: Header text for the modal.
* - open: Controls whether the modal is visible.
* - onClose: Callback to close the modal.
* - updateProject: The project currently being edited.
* - setUpdatedProject: Function to update the project in parent state.
* - onSubmit: Callback for submitting final changes.
* - onAutoSave: Callback for automatically saving intermediate changes.
*
* Notes:
* - Auto-save timeout is tracked and cleared on unmount.
* - External changes are detected using Supabase channels but do not overwrite local edits.
* - All project fields are saved as a single atomic update.
*/
export default function EditProjectModal({ message, open, onClose, updateProject, setUpdatedProject, onSubmit, onAutoSave }) {
  if (!open || !updateProject) return null;

  // Local state for immediate UI updates
  const [displayProject, setDisplayProject] = useState(updateProject);

  // Ref to track active debounce timer
  const saveTimeoutRef = useRef(null);

  // Ref to always hold the most recent project state for reliable auto-save
  const latestDisplayProjectRef = useRef(updateProject);

  // Sync local state when external project updates arrive
  useEffect(() => {
    setDisplayProject(updateProject);
    latestDisplayProjectRef.current = updateProject;
  }, [updateProject]);

  // Detect external changes from other users
  useEffect(() => {
    if (!open || !updateProject) return;

    const channel = supabase
      .channel(`modal-project-${updateProject.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${updateProject.id}`
        },
        (payload) => {
          // Only act if the update comes from another user
          if (payload.new.updated_at !== displayProject.updated_at) {
            console.log('External change detected in project modal');
            // Optional: notify user of external changes
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [open, updateProject, displayProject]);

  /**
   * Debounced field change handler.
   *
   * Responsibilities:
   * 1. Instantly update UI for responsive typing.
   * 2. Keep latestDisplayProjectRef synchronized for auto-save reliability.
   * 3. Sync changes to parent state.
   * 4. Debounce saves to prevent excessive database writes.
   * 5. Save the entire project as a single atomic update.
   */
  const handleFieldChange = (field, value) => {
    const updatedDisplayProject = { ...displayProject, [field]: value };

    // Immediate UI update
    setDisplayProject(updatedDisplayProject);

    // Update ref for reliable auto-save
    latestDisplayProjectRef.current = updatedDisplayProject;

    // Sync with parent state
    setUpdatedProject(updatedDisplayProject);

    // Clear previous save timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule debounced save
    saveTimeoutRef.current = setTimeout(() => {
      onAutoSave(latestDisplayProjectRef.current);
    }, 300);
  };

  // Wrapper to handle final submission
  const handleSubmit = () => {
    onSubmit(displayProject.id, displayProject);
    onClose();
  };

  // Cleanup debounce timer on unmount
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
          <div className={styles.form_section} style={{ marginBottom: '40px' }}>
            <h3 className={styles.section_title} style={{ marginBottom: '20px' }}>Project Details</h3>

            <div className={styles.form_group} style={{ marginBottom: '24px' }}>
              <label htmlFor="title" className={styles.form_label}>
                Title <span className={styles.required}>*</span>
              </label>
              <input
                id="title"
                type="text"
                placeholder="Enter project title"
                value={displayProject.title ?? ""}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={styles.form_input}
                required
                style={{ padding: '14px 16px', fontSize: '1rem' }}
              />
            </div>

            <div className={styles.form_group} style={{ marginBottom: '24px' }}>
              <label htmlFor="description" className={styles.form_label}>
                Description
              </label>
              <textarea
                id="description"
                placeholder="Describe your project..."
                value={displayProject.description ?? ""}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className={`${styles.form_input} ${styles.textarea}`}
                rows={5}
                style={{ minHeight: '120px' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
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
            disabled={!displayProject.title?.trim()}
          >
            Update Project
          </button>
        </div>
      </div>
    </div>
  );
}
