//Random ID creation (needed for indentifying clients for clocking mechanism)
export function getClientID() {
  let id = localStorage.getItem('client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('client_id', id);
  }
  return id;
}
