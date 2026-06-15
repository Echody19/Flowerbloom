function handleAction(action) {
  if (action === 'chat-with-spirit') {
    window.location.href = 'chat.html';
    return;
  }

  if (action === 'enter-garden') {
    window.location.href = 'garden.html';
  }
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');

  if (!trigger) {
    return;
  }

  handleAction(trigger.dataset.action);
});
