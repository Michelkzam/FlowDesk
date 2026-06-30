export function openTicketWindow(ticketId) {
  window.location.href = `/chat?ticket=${ticketId}`;
}
