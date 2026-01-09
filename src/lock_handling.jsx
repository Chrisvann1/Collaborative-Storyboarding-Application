import { supabase } from './supabase-client'
import { getClientID } from './client_id.jsx'

/*========================================================================*/
/*============ BOARD LEVEL LOCKS =========================================*/
/*========================================================================*/

//Aquire Edit Board Lock Function - (If not aquired you cannot edit the board)
export async function acquireLock(boardId) {
    const clientID = getClientID(); 
    const { data, error } = await supabase.rpc('acquire_board_lock', {
        board_id: boardId, 
        client_id: clientID,
        ttl_seconds: 300
    });

    if (error) {
        console.error("Lock cannot be acquired currently", error)
        return false
    }

    return data; 
}

//Release Edit Board Lock Function - (Frees up the board for others to edit)
export async function releaseLock(boardId) {
  const clientId = getClientID();
  const { error } = await supabase.rpc('release_board_lock', {
    board_id: boardId,
    client_id: clientId,
  });

  if (error) {
    console.error('Error releasing lock', error); 
    return false;
  }

  return true; 
}

//Safely deletes a board by checking to make sure no one has the edit lock
export async function safeDeleteBoard(boardId) {
    const clientID = getClientID();
    const { error } = await supabase.rpc('safe_delete_board', {
        board_id: boardId, 
        client_id: clientID
    });

    if (error) {
        throw new Error(error.message);
    }

    return true; 
}

// Aquire Drag Lock - Advisory Lock for drag operations (only one person can drag at a time)
export const acquireDragLock = async (projectId) => {
  try {
    console.log("Attempting to acquire drag lock for project:", projectId);
    const { data, error } = await supabase.rpc("acquire_project_drag_lock", { 
      p_project_id: Number(projectId) 
    });
    
    if (error) {
      console.error("Error acquiring drag lock:", error);
      return false;
    }
    console.log("Drag lock acquired:", data);
    return data === true;
  } catch (err) {
    console.error("Exception acquiring drag lock:", err);
    return false;
  }
};

// Release Drag Lock - Releases after drag operation is complete
export const releaseDragLock = async (projectId) => {
  try {
    console.log("Releasing drag lock for project:", projectId);
    // Advisory locks auto-release at transaction end, but call RPC for consistency
    const { error } = await supabase.rpc("release_project_drag_lock", { 
      p_project_id: Number(projectId) 
    });
    
    if (error) {
      console.error("Error in release drag lock:", error);
    }
  } catch (err) {
    console.error("Exception in release drag lock:", err);
  }
};


/*========================================================================*/
/*============ INTERNAL PROJECT LEVEL LOCKS (entering the project) =======*/
/*========================================================================*/

//Aquire Project Session Lock - it is not exclusive
//Everyone who enters a project gets a lock for that project - prevents deletion while in use
export async function acquireProjectSessionLock(projectId) {
  const clientId = getClientID();
  const { data, error } = await supabase.rpc('acquire_project_session_lock', {
    project_id: projectId,
    client_id: clientId,
    ttl_seconds: 300
  });
  
  if (error) {
    console.error('Error acquiring project session lock', error);
    alert('Failed to access: someone might be deleting the project');
    return false;
  }
  return data;
}

//Reset the TTL on the project session lock if you edit within the project (For inactivity timeout)
export async function refreshProjectSessionLock(projectId) {
  const clientId = getClientID();
  const { data, error } = await supabase.rpc('refresh_project_session_lock', {
    project_id: projectId,
    client_id: clientId,
    ttl_seconds: 300
  });
  
  if (error) {
    console.error('Error refreshing project session lock', error);
    alert('Error: Project may have been deleted');
    return false;
  }
  return data;
}

//Release Project Session Lock - when you leave the project page
export async function releaseProjectSessionLock(projectId) {
  const clientId = getClientID();
  const { error } = await supabase.rpc('release_project_session_lock', {
    project_id: projectId,
    client_id: clientId,
  });
  
  if (error) {
    console.error('Error releasing project session lock', error);
    return false;
  }
  return true;
}


/*========================================================================*/
/*============ EXTERNAL PROJECT LEVEL LOCKS (project page) ===============*/
/*========================================================================*/

// Aquire Project Edit Lock - Exclusive and is for if you are editing the project details (name and description)
export async function acquireProjectEditLock(projectId) {
  const clientId = getClientID();
  const { data, error } = await supabase.rpc('acquire_project_edit_lock', {
    project_id: projectId,
    client_id: clientId,
    ttl_seconds: 300
  });
  
  if (error) {
    console.error('Error acquiring project edit lock', error);
    return false;
  }
  return data;
}

//Release Project Edit Lock - Release lock after you leave the modal for editing a project (name and description)
export async function releaseProjectEditLock(projectId) {
  const clientId = getClientID();
  const { error } = await supabase.rpc('release_project_edit_lock', {
    project_id: projectId,
    client_id: clientId,
  });
  
  if (error) {
    console.error('Error releasing project edit lock', error);
    return false;
  }
  return true;
}

//Safely deletes a project - checks to ensure no one has session lock or project edit lock
export async function safeDeleteProject(projectId) {
  const { error } = await supabase.rpc('safe_delete_project', {
    target_project_id: projectId
  });

  if (error) {
    throw new Error(error.message);
  }
  return true;
}