const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const chatMessages = document.querySelector('#chat-messages');
const flowerGenerateEntry = document.querySelector('#flower-generate-entry');
const generateTodayFlowerButton = document.querySelector('[data-action="generate-today-flower"]');

function createMessage(senderName, message, senderType) {
  const messageElement = document.createElement('article');
  messageElement.className = 'chat-message';
  messageElement.dataset.sender = senderType;

  const senderElement = document.createElement('h2');
  senderElement.textContent = senderName;

  const contentElement = document.createElement('p');
  contentElement.textContent = message;

  messageElement.append(senderElement, contentElement);
  return messageElement;
}

function appendChatMessage(senderName, message, senderType) {
  chatMessages.append(createMessage(senderName, message, senderType));
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleChatSubmit(event) {
  event.preventDefault();

  const message = chatInput.value.trim();

  if (!message) {
    return;
  }

  appendChatMessage('花主', message, 'owner');
  chatInput.value = '';
  appendChatMessage('花灵', '我听见了。今天的故事已经可以长成一朵花。', 'spirit');
  flowerGenerateEntry.hidden = false;
}

chatForm.addEventListener('submit', handleChatSubmit);

generateTodayFlowerButton.addEventListener('click', () => {
  window.location.href = 'flower.html';
});
