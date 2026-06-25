export function openTicketWindow(ticketId) {
  const width = 1100;
  const height = 750;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  window.open(
    `/ticket-popup/${ticketId}`,
    `ticket_${ticketId}`,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}
