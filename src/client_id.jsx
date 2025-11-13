//Creates a random ID that is saved to local storage 
//This is needed for the locking functionality

//Local Storage is scoped to the browser
export function getClientID() {
  let id = localStorage.getItem('client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('client_id', id);
  }
  return id;
}
