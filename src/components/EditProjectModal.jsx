import styles from "./EditProjectModal.module.css";
import { supabase } from "../supabase-client.js";
import { useRef, useState, useEffect } from "react"

export default function EditProjectModal({ message, open, onClose, updateProject, setUpdatedProject, onSubmit, onAutoSave }) {
  if (!open || !updateProject) return null;

  // Input buffer pattern to prevent cut-off letters
  const [displayProject, setDisplayProject] = useState(updateProject);
  const saveTimeoutRef = useRef(null);
  const latestDisplayProjectRef = useRef(updateProject);

  // Update display project when updateProject changes from external sources
  useEffect(() => {
    setDisplayProject(updateProject);
    latestDisplayProjectRef.current = updateProject;
  }, [updateProject]);

  // Add external change detection
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
          // Only update if the change came from another user (not our own auto-save)
          if (payload.new.updated_at !== displayProject.updated_at) {
            console.log('External change detected in project modal');
            // Optionally show a notification
            // alert('This project was updated by another user. Your changes may be lost.');
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [open, updateProject, displayProject]);

  // FIXED: Simple debounce that saves the ENTIRE current state
  const handleFieldChange = (field, value) => {
    // IMMEDIATE visual update - user sees their typing instantly
    const updatedDisplayProject = { ...displayProject, [field]: value };
    setDisplayProject(updatedDisplayProject);
    latestDisplayProjectRef.current = updatedDisplayProject;
    
    // Update parent component's state for consistency
    setUpdatedProject(updatedDisplayProject);
    
    // FIXED: Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // FIXED: Set new timeout to save the ENTIRE current project state
    saveTimeoutRef.current = setTimeout(() => {
      const currentProject = latestDisplayProjectRef.current;
      
      // Save the entire current state using onAutoSave
      onAutoSave(currentProject);
    }, 300); // Short delay to catch rapid typing
  };

  // Wrapper to handle submission
  const handleSubmit = () => {
    onSubmit(displayProject.id, displayProject);
    onClose();
  };

  // Cleanup timeout on unmount
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
        <h2>{message}</h2>

        {/* Title */}
        <input
          type="text"
          placeholder="Title (REQUIRED)"
          value={displayProject.title ?? ""}
          onChange={(e) => handleFieldChange('title', e.target.value)}
        />

        {/* Description */}
        <textarea
          placeholder="Description"
          value={displayProject.description ?? ""}
          onChange={(e) => handleFieldChange('description', e.target.value)}
        />

        <button onClick={handleSubmit}>Submit</button>
        <button className={styles.close_modal} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}