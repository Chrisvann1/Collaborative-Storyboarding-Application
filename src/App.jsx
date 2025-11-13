import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditProject from './pages/EditProject.jsx'
import Login from './pages/Login.jsx'
import CreateProject from './pages/CreateProject.jsx'



export default function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route index element={<Login />}/>
          <Route path="projects/:id" element={<EditProject/>}/>
          <Route path="CreateProject" element={<CreateProject/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  )
}