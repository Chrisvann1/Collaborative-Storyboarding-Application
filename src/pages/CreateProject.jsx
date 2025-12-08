import { supabase } from "../supabase-client.js"
import { useState } from 'react';
import { useEffect } from 'react';
import ProjectButton from "../components/CreateProjectButton.jsx"
import ProjectModal from "../components/CreateProjectModal.jsx"
import EditProjectModal from "../components/EditProjectModal.jsx"
import { useNavigate } from "react-router-dom";
import { acquireProjectEditLock, 
         releaseProjectEditLock, 
         safeDeleteProject } from "../lock_handling.jsx";





export default function CreateProject() {
  //Object to navigate to different pages
  const navigate = useNavigate();

  //stateful variable for adding a new project
  const[newProject, setNewProject] = useState({title: "", description: ""})

  //Stateful for whether model is open or closed
  const[modalOpen,setModalOpen] = useState(false);

  //Stateful variable for whether update modal is open or closed
  const[updateModalOpen, setUpdateModalOpen] = useState(false); 

  //For viewing available projects
  const [projects, setProjects] = useState([]);

  //For selecting a project (if you click on edit or delete that is the selected project)
  const [selectedProject, setSelectedProject] = useState(null);

  //Track which project id we currently hold an edit lock for
  const [lockedProjectId, setLockedProjectId] = useState(null);


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

  useEffect(() => {
      fetchProjects();
  }, []);

  //In React - A side effect is something that affects something outside the component's 
  //render process - Exp: fetch data, subscribe, update, save, 
  //useEffect - the function to pass to useEffect will run after a component renders
  //Anytime there is a change to whatever you specify (like of a count changes for example)
  //UseEffect will trigger a function
  //Update frontend for all clients if any client makes a change to the projects table
  useEffect(() => {
    //A channel is just an webSocket object that listens for database 
    //changes 
    const channel = supabase 
    //channel name
    .channel(`projects`)
    //.on tells the channel specificalloy what to look for. In this instance it 
    //it looking for any post_gres changes
    .on(
      'postgres_changes', 
      {event: '*', schema: 'public', table: 'projects'},
      //The payload is just the message supabase sends that details the changes made to the database
      //This function is the event handler - whenever a change is made to the database 
      //this function is called (with the payload parameter)
      (payload) => {
        console.log('Project Changed:', payload)
        fetchProjects(); 
      }

    )

    .on(
    'postgres_changes', 
    {
      event: 'DELETE', 
      schema: 'public', 
      table: 'projects'
    },

    (payload) => {
      console.log('Project DELETE detected:', payload)
      // For DELETE events, we can't filter by project_id, so we refresh regardless
      // This is safe because fetchBoards() only gets boards for our project
      console.log('Refreshing due to DELETE event')
      fetchProjects();
    }
  )

    
    .subscribe(); 

    return () => {
      channel.unsubscribe();
    }
  }, []);

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

//Handles updating project fields
const handleUpdateProject = async (id, updatedFields) => {
  // Just do the update - lock was already acquired when modal opened
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
  
  return true; // Return true to indicate success
}

//Deletes a project (first checking the 2 locks through the safeDeleteProject function)
const handleDeleteProject = async (id) => {
  try {
    await safeDeleteProject(id);
    
    // If we get here, deletion was successful
    // Refresh the projects list to show the project is gone
    fetchProjects();
    
  } catch (error) {
    // If safe_delete_project throws an error, show it to the user
    alert(error.message); // Shows: "Project cannot be deleted: X user(s) are currently working..." 
  }
}



    return (
    <>    
    
    <ProjectButton
        onClick={() => setModalOpen(true)}
        message = "Create Project"
    >Create Project 
    </ProjectButton>

    <ProjectModal
        message = "Create Project"
        open = {modalOpen}
        onClose={() => setModalOpen(false)}
        newProject = {newProject}
        setNewProject = {setNewProject}
        onSubmit={handleAddProject}
    />

    <EditProjectModal
      message = "Edit Project"
      open = {updateModalOpen}
      onClose={async () => {
        // release lock
        if (lockedProjectId) {
          await releaseProjectEditLock(lockedProjectId);
          setLockedProjectId(null);
        }
        setUpdateModalOpen(false);
        setSelectedProject(null);
      }}
      updateProject = {selectedProject}
      setUpdatedProject = {setSelectedProject}
      onSubmit={async (id, updatedFields) => {
        await handleUpdateProject(id, updatedFields);
        setUpdateModalOpen(false);
        setSelectedProject(null);
      }}
      onAutoSave={async (updatedFields) => {
        await handleUpdateProject(selectedProject.id, updatedFields); // save but do NOT close
      }}
    />

    
{/* Projects container */}
  <div className="projects_container">
        {projects.map((project) => (
          <div
            key={project.id} 
            className="project_card"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="project_actions">
            <button onClick={async (e) => { 
              e.stopPropagation();
              const ok = await acquireProjectEditLock(project.id);
              if (!ok) {
                alert('This project is currently being edited by someone else.');
                return;
              }
              setSelectedProject(project); 
              setLockedProjectId(project.id);
              setUpdateModalOpen(true); 
            }}>Edit</button>

              <button onClick={async (e) => { 
                e.stopPropagation();
                try {
                  await handleDeleteProject(project.id);
                } catch (error) {
                  alert(error.message);
                }
              }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );


}