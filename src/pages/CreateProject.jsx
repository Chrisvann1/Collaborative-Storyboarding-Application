import { supabase } from "../supabase-client.js"
import { useState } from 'react';
import { useEffect } from 'react';
import ProjectButton from "../components/CreateProjectButton.jsx"
import ProjectModal from "../components/CreateProjectModal.jsx"
import EditProjectModal from "../components/EditProjectModal.jsx"
import DeleteProjectModal from "../components/DeleteProjectModal.jsx";
import { useNavigate } from "react-router-dom";
import { acquireProjectEditLock, 
         releaseProjectEditLock, 
         safeDeleteProject } from "../lock_handling.jsx";
import { getClientID } from "../client_id.jsx";
import { acquireProjectSessionLock} from "../lock_handling.jsx";




export default function CreateProject() {

  //Object to navigate to different pages
  const navigate = useNavigate();

  /*===========================================================*/
  /*==========STATEFUL VARIABLES===============================*/
  /*===========================================================*/

  //stateful variable for adding a new project
  const[newProject, setNewProject] = useState({title: "", description: ""})

  //Stateful for whether add project model is open or closed
  const[modalOpen,setModalOpen] = useState(false);

  //Stateful variable for whether update project modal is open or closed
  const[updateModalOpen, setUpdateModalOpen] = useState(false); 

  //Stateful for delete confirmation modal
  const[deleteModalOpen, setDeleteModalOpen] = useState(false);

  //Stateful For viewing available projects
  const [projects, setProjects] = useState([]);

  //Stateful selecting a project (if you click on edit or delete that is the selected project)
  const [selectedProject, setSelectedProject] = useState(null);

  //Stateful to track which project id we currently hold an edit lock for
  const [lockedProjectId, setLockedProjectId] = useState(null);


  /*===========================================================*/
  /*==========FUNCTIONS=======================================*/
  /*===========================================================*/

  //Fetches projects from supabase databases
    const fetchProjects = async () => {
      const {error, data} = await supabase 
          .from("projects")
          .select("*")
          .order("updated_at", { ascending: false });

      if (error) {
          console.error("Error fetching projects", error.message); 
          return;
      }

      setProjects(data);

  }

//Handles updating project fields (No need to aquire locks here as they are handled before opening the edit modal)
const handleUpdateProject = async (id, updatedFields) => {
  const {error} = await supabase 
    .from("projects")
    .update(updatedFields)
    .eq("id", id);

  if (error) {
    console.error("Error updating project", error.message);
    return false;
  }

  //refresh projects
  fetchProjects();
  
  return true; 
}

//Deletes a project (first checking the 2 locks through the safeDeleteProject function)
const handleDeleteProject = async (id) => {
  try {
    await safeDeleteProject(id);
    
    // Refresh the projects list to show the project is gone
    fetchProjects();
    
  } catch (error) {
    // If safe_delete_project throws an error, show it to the user
    alert(error.message);
  }
}

  //function to insert newProject into supabase database
  const handleAddProject = async (e) => {
      e.preventDefault();

      const { error } = await supabase.from("projects").insert(newProject).single()

      if (error) {
          console.error("Error adding project: ", error.message);
          return;
          }

      fetchProjects();
      setNewProject({})
      setModalOpen(false);

  }

  /*===========================================================*/
  /*==========USE EFFECTS======================================*/
  /*===========================================================*/
  /*In React, useEffect is a hook that lets you perform side effects in function components.*/
  /* Anytime there is a change to whatever you specify (like of a count changes for example)*/
  /* UseEffect will trigger a function*/
  
  /*Websockets are a way to open an interactive communication session between the user's browser and a server.*/
  /*With websockets, you can send messages to a server and receive event-driven responses without having to poll the server for a reply.*/
  /*Channels - abstractions that let you use WebSocket-based real-time features in Supabase without managing WebSockets directly */

  //Lifecycle: Fetch projects when project page loads
  useEffect(() => {
      fetchProjects();
  }, []);


  /* useEffect that Subribes to Supabase real-time changes on the projects table
  *
  * postgres_changes - Listens for changes in a PostgreSQL table.
  * 
  * Whenever a project is inserted, updated, or deleted, the fetchProjects function is called to refresh the list of projects.
  * Ensuring the UI stays in sync with the database in real-time.
  * 
  * Lifecycle:
  * - Subscribes to changes when the project is created
  * - Unsubscribes when the component is deleted/unmounted
  */
  useEffect(() => {
    const channel = supabase 
    .channel(`projects`)
    .on(
      'postgres_changes', 
      {event: '*', schema: 'public', table: 'projects'},
      (payload) => {
        console.log('Project Changed:', payload)
        fetchProjects(); 
      }

    )

    // Specifically handle DELETE events to log and refresh
    // The delete event was not being properly captured by the '*' event for some reason
    .on(
    'postgres_changes', 
    {
      event: 'DELETE', 
      schema: 'public', 
      table: 'projects'
    },

    (payload) => {
      console.log('Project DELETE detected:', payload)
      console.log('Refreshing due to DELETE event')
      fetchProjects();
    }
  )
    .subscribe(); 

    return () => {
      channel.unsubscribe();
    }
  }, []);


  /*
   * This useEffect periodically checks if we still hold the edit lock for the project being edited.
   * 
   * Polls the 'exclusive_resource_locks' table every 2 seconds to check that 
   * a lock still exists for: 
   * - resource_type = 'project_edit'
   * - resource_id = lockedProjectId
   * - locked_by = current client ID
   * 
   * If the lock is missing or invalid, closes the modal, clears the selected project,
   * and notifies the user that someone else is now editing the project.
   * 
   * Lifecycle: 
   * - Starts polling when modal opens and project locks 
   * - Stops polling when modal closes or lock is released
  */
  useEffect(() => {
    if (!updateModalOpen || !lockedProjectId) return;

    const checkEditLock = async () => {
      const clientId = getClientID();
      
      // Check if we still have the project edit lock
      const { data: lock, error } = await supabase
        .from('exclusive_resource_locks')
        .select('*')
        .eq('resource_type', 'project_edit')
        .eq('resource_id', lockedProjectId)
        .eq('locked_by', clientId)
        .maybeSingle();

      // If lock doesn't exist or has expired, close the modal and set selected project to null
      // Also notify the user
      if (error || !lock) {
        console.log('Project edit lock lost, closing modal');
        setUpdateModalOpen(false);
        setLockedProjectId(null);
        setSelectedProject(null);
        alert('Someone else is now editing this project.');
      }
    };

    // Check lock every 2 seconds
    const lockCheckInterval = setInterval(checkEditLock, 2000);

    return () => clearInterval(lockCheckInterval);
  }, [updateModalOpen, lockedProjectId]);


/**
 * Renders the Projects page UI, including project creation, editing, deletion,
 * and navigation with concurrency control.
 *
 * Structure:
 * - Header section - displays the application title and a "Create Project" action
 * - Modals - components for creating, editing, and deleting projects
 * - Main Section - a grid of project cards representing the user's projects
 *
 *
 *
 * State management:
 * - Modal visibility and selected project state are managed via React state
 */
  return (
    <>
      {/* Header Section */}
      <header className="projects_page_header">
        <div className="header_content">
          <h1 className="app_title">Shot Sync</h1>
          <div className="header_actions">
            <ProjectButton
              onClick={() => setModalOpen(true)}
              message="+ Create New Project"
            >
              <span className="plus_sign">+</span> Create Project
            </ProjectButton>
          </div>
        </div>
        <div className="header_subtitle">
          <p>Create and manage your storyboard projects</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="projects_main_content">
        {/* Create Project Modal*/}
        <ProjectModal
          message="Create Project"
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          newProject={newProject}
          setNewProject={setNewProject}
          onSubmit={handleAddProject}
        />

        {/* Edit Project Modal */}  
        <EditProjectModal
          message="Edit Project"
          open={updateModalOpen}
          onClose={async () => {
            if (lockedProjectId) {
              await releaseProjectEditLock(lockedProjectId);
              setLockedProjectId(null);
            }
            setUpdateModalOpen(false);
            setSelectedProject(null);
          }}
          updateProject={selectedProject}
          setUpdatedProject={setSelectedProject}
          onSubmit={async (id, updatedFields) => {
            await handleUpdateProject(id, updatedFields);
            setUpdateModalOpen(false);
            setSelectedProject(null);
          }}
          onAutoSave={async (updatedFields) => {
            await handleUpdateProject(selectedProject.id, updatedFields);
          }}
        />

        {/* Delete Project Confirmation Modal */}
        <DeleteProjectModal
          open={deleteModalOpen}
          projectTitle={selectedProject?.title}
          onCancel={() => {
            setDeleteModalOpen(false);
            setSelectedProject(null);
          }}
          onConfirm={async () => {
            // Attempt to delete the project, else show error
            try {
              await handleDeleteProject(selectedProject.id);
              setDeleteModalOpen(false);
              setSelectedProject(null);
            } catch (error) {
              alert(error.message);
              setDeleteModalOpen(false);
              setSelectedProject(null);
            }
          }}
        />

        {/* Projects Grid Section */}
        <section className="projects_section">
          <h2 className="section_title">Your Projects</h2>
          {/* Display empty state if no projects. Else, show project grid*/}
          {projects.length === 0 ? (
            <div className="empty_state">
              <h3>No projects yet</h3>
              <p>Create your first project to get started</p>
            </div>
          ) : 
          (

            /**
             * Projects Grid
             *
             * Renders all user projects in a grid layout with interactive project cards.
             *
             * Structure:
             * - Each project is represented by a card displaying:
             *    - Project title
             *    - Project description (or "" if none is provided)
             *    - Last updated date
             *    - Action buttons: Edit and Delete
             * 
             * Concurrency handling:
             * - Session locks prevents a user from deleting a project while another user is working on it
             * - Edit locks prevent multiple users from editing the same project at the same time
             * - Locks are released when modals are closed or actions are completed
             *
             *
             * Edit button:
             * - Attempts to acquire a **project edit lock** via `acquireProjectEditLock`.
             *   - If successful:
             *       - Sets the clicked project as `selectedProject`
             *       - Tracks `lockedProjectId`
             *       - Opens the `EditProjectModal`
             *   - If not successful:
             *       - Alerts the user that the project is being edited by someone else.
             *
             * Delete button:
             * - Sets the clicked project as `selectedProject`.
             * - Opens the `DeleteProjectModal` to confirm deletion.
             *
             */

            <div className="projects_grid">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="project_card"
                  // Aquire lock when opening project 
                  onClick={async() => {
                    const lockAquired = await acquireProjectSessionLock(project.id);
                    if (lockAquired) {
                      navigate(`/projects/${project.id}`);
                    }
                    else {
                      alert('Project session lock could not be acquired.');
                    }
                  }}
                >
                  {/* Project Card Content */}
                  <div className="project_card_content">
                    <h3>{project.title}</h3>
                    <p>{project.description || "No description"}</p>
                    <div className="project_card_footer">
                      <span className="project_date">
                        Updated: {new Date(project.updated_at).toLocaleDateString()}
                      </span>
                      <div className="project_actions">
                        <button 
                          onClick={async (e) => { 
                            e.stopPropagation();
                            const ok = await acquireProjectEditLock(project.id);
                            if (!ok) {
                              alert('This project is currently being edited by someone else.');
                              return;
                            }
                            setSelectedProject(project); 
                            setLockedProjectId(project.id);
                            setUpdateModalOpen(true); 
                          }}
                          className="edit_button"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={async (e) => { 
                            e.stopPropagation();
                            setSelectedProject(project);
                            setDeleteModalOpen(true);
                          }}
                          className="delete_button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}