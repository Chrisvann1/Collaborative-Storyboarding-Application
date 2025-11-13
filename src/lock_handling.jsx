import { supabase } from './supabase-client'
import { getClientID } from './client_id.jsx'

//This function tries to acquire the lock to edit a board (if lock cannot be acquired then you cannot currently edit this board)
export async function acquireLock(boardId) {
    //Calls a PostgreSQL function that checks if the lock can be acquired
    const clientID = getClientID(); 
    const { data, error } = await supabase.rpc('acquire_board_lock', {
        board_id: boardId, 
        client_id: clientID,
        ttl_seconds: 200
    });

    if (error) {
        console.error("Lock cannot be acquired currently", error)
        return false
    }

    return data; 
}


//This function will release the lock 
//This function will be called if someone leaves the edit_board modal
//so others can acquire the lock
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

//Lock you get when entering a project - it is not exclusive
//Everyone who enters a project gets a lock for that project
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

//Anytime you make an edit while inside of a project the expiration time 
//will reset (testing for inactivity)
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

//Release the lock whenever you leave the project
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

// Project Edit Lock
// This lock is exclusive and is for if you are editing the description or title of a project
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

//Release lock after you leave the modal for editing a project (name and description)
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

//Safely deletes a project by checking to make sure no one has either the 
//project session lock or project edit lock 
export async function safeDeleteProject(projectId) {
  const { error } = await supabase.rpc('safe_delete_project', {
    target_project_id: projectId
  });

  if (error) {
    throw new Error(error.message);
  }
  return true;
}
