import { supabase } from "../supabase-client.js"
import { useState } from 'react';
import { useEffect } from 'react';
import ProjectButton from "../components/CreateProjectButton.jsx"
import ProjectModal from "../components/CreateProjectModal.jsx"
import UpdateProjectModal from "../components/UpdateProjectModal.jsx"
import { useNavigate } from "react-router-dom";


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
    const [selectedProject, setSelectedProject] = useState([]);


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

  const handleUpdateProject = async (id, updatedFields) => {
    const {error} = await supabase 
      .from("projects")
      .update(updatedFields)
      .eq("id", id);

      if (error) {
        console.error("Error updating project", error.message);
        return;
      }

  //refresh projects
  fetchProjects();
  setUpdateModalOpen(false);
  setSelectedProject(null);
}


  //handles a user deleting a project
  const handleDeleteProject = async (id) => {
    const {error1} = await supabase 
      .from("boards")
      .delete()
      .eq("project_id", id); 

    if (error1) {
      console.error("Error deleting boards associated with the project: ", error1.message);
      return; 
    }

    const {error2} = await supabase 
      .from("projects")
      .delete()
      .eq("id", id); 

    if (error2) {
      console.error("Error deleting project: ", error2.message);  
    }

    fetchProjects();
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

    <UpdateProjectModal
      message = "Update Project"
      open = {updateModalOpen}
      onClose={() => setUpdateModalOpen(false)}
      updateProject = {selectedProject}
      setUpdatedProject = {setSelectedProject}
      onSubmit={handleUpdateProject}

    />

    

    {/*Projects Container */}
{/* Projects container */}
  <div className="projects_container">
        {projects.map((project) => (
          <div
            key={project.id} // ✅ key on the top-level element
            className="project_card"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="project_actions">
              <button onClick={(e) => { 
                e.stopPropagation();
                setSelectedProject(project); 
                setUpdateModalOpen(true); 
              }}>Edit</button>

              <button onClick={(e) => { 
                e.stopPropagation();
                handleDeleteProject(project.id);
                }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );


}