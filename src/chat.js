const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const chatMessages = document.querySelector('#chat-messages');
const chatError = document.querySelector('#chat-error');
const submitButton = chatForm.querySelector('button[type="submit"]');
const chatHistoryStorageKey = 'echobloom-chat-history-v1';
const maxConversationMessages = 12;

let isSending = false;
const conversationMessages = loadConversationMessages();

function createMessage(senderName, message, senderType, action) {
  const messageElement = document.createElement('article');
  messageElement.className = 'chat-message';
  messageElement.dataset.sender = senderType;

  const senderElement = document.createElement('h2');
  senderElement.textContent = senderName;

  const contentElement = document.createElement('p');
  contentElement.textContent = message;

  messageElement.append(senderElement, contentElement);

  if (action) {
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.className = 'chat-message-action';
    actionButton.dataset.action = action.name;
    actionButton.textContent = action.label;
    messageElement.append(actionButton);
  }

  return messageElement;
}

function createSpiritReplyCard(message, action) {
  const messageElement = document.createElement('article');
  messageElement.className = 'chat-message chat-message-spirit-structured';
  messageElement.dataset.sender = 'spirit';

  const senderElement = document.createElement('h2');
  senderElement.textContent = '花灵';

  const sectionsElement = document.createElement('div');
  sectionsElement.className = 'chat-spirit-sections';

  splitSpiritReply(message).forEach((segment, index) => {
    const sectionElement = document.createElement('section');
    sectionElement.className = 'chat-spirit-section';
    sectionElement.dataset.part = String(index + 1);

    const paragraphElement = document.createElement('p');
    paragraphElement.textContent = segment;
    sectionElement.append(paragraphElement);
    sectionsElement.append(sectionElement);
  });

  messageElement.append(senderElement, sectionsElement);

  if (action) {
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.className = 'chat-message-action';
    actionButton.dataset.action = action.name;
    actionButton.textContent = action.label;
    messageElement.append(actionButton);
  }

  return messageElement;
}

function createLoadingMessage() {
  const loadingElement = createMessage('花灵', '正在整理今天的花语', 'spirit');
  loadingElement.classList.add('chat-message-loading');

  const loadingText = loadingElement.querySelector('p');
  loadingText.innerHTML = '<span>正在整理今天的花语</span><i></i><i></i><i></i>';

  return loadingElement;
}

function appendChatMessage(senderName, message, senderType, action) {
  chatMessages.append(createMessage(senderName, message, senderType, action));
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendSpiritReply(message, action) {
  chatMessages.append(createSpiritReplyCard(message, action));
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function splitSpiritReply(message) {
  const content = String(message || '').trim();

  if (!content) {
    return [];
  }

  const starters = ['我在想，', '我想多问你一句，', '我已经看见今天的花了，'];
  const boundaries = starters
    .map((starter) => content.indexOf(starter))
    .filter((index) => index > 0)
    .sort((first, second) => first - second);

  if (!boundaries.length) {
    return [content];
  }

  return [0, ...boundaries]
    .map((start, index, starts) => {
      const end = starts[index + 1] ?? content.length;
      return content.slice(start, end).trim();
    })
    .filter(Boolean);
}

function setSendingState(nextIsSending) {
  isSending = nextIsSending;
  chatInput.disabled = nextIsSending;
  submitButton.disabled = nextIsSending;
  submitButton.textContent = nextIsSending ? '整理中' : '发送';
}

function showError(message) {
  chatError.textContent = message;
  chatError.hidden = false;
}

function clearError() {
  chatError.textContent = '';
  chatError.hidden = true;
}

function normalizeConversationMessage(message) {
  const role = message?.role === 'assistant' ? 'assistant' : 'user';
  const content = String(message?.content || '').trim();
  const action = normalizeAction(message?.action);

  if (!content) {
    return null;
  }

  return { role, content, action };
}

function normalizeAction(action) {
  if (!action?.name || !action?.label) {
    return null;
  }

  return {
    name: String(action.name),
    label: String(action.label),
  };
}

function loadConversationMessages() {
  try {
    const savedMessages = JSON.parse(window.sessionStorage.getItem(chatHistoryStorageKey) || '[]');

    if (!Array.isArray(savedMessages)) {
      return [];
    }

    return savedMessages
      .map(normalizeConversationMessage)
      .filter(Boolean)
      .slice(-maxConversationMessages);
  } catch {
    return [];
  }
}

function saveConversationMessages() {
  try {
    window.sessionStorage.setItem(
      chatHistoryStorageKey,
      JSON.stringify(conversationMessages.slice(-maxConversationMessages))
    );
  } catch {
    // Storage can be unavailable in private browsing. The in-memory history still works.
  }
}

function getApiMessages() {
  return conversationMessages.map(({ role, content }) => ({ role, content }));
}

function renderStoredConversation() {
  if (!conversationMessages.length) {
    return;
  }

  chatMessages.replaceChildren();

  conversationMessages.forEach((message) => {
    if (message.role === 'assistant') {
      appendSpiritReply(message.content, message.action);
      return;
    }

    appendChatMessage('花主', message.content, 'owner');
  });
}

async function requestSpiritReply(messages) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || '花灵暂时没有回应，请稍后再试。');
  }

  return payload;
}

function isReadyToBloomReply(reply) {
  return (
    reply?.isReadyToBloom === true ||
    reply?.is_ready_to_bloom === true ||
    reply?.mode === 'ready_to_generate' ||
    reply?.action?.name === 'generate-today-flower'
  );
}

function savePendingFlowerFromReply(reply) {
  if (!isReadyToBloomReply(reply)) {
    return;
  }

  window.EchoBloomFlowerStore?.savePendingFlower(reply);
}

function trimConversationMessages() {
  if (conversationMessages.length <= maxConversationMessages) {
    return;
  }

  conversationMessages.splice(0, conversationMessages.length - maxConversationMessages);
}

async function handleChatSubmit(event) {
  event.preventDefault();

  if (isSending) {
    return;
  }

  const message = chatInput.value.trim();

  if (!message) {
    return;
  }

  clearError();
  appendChatMessage('花主', message, 'owner');
  conversationMessages.push({ role: 'user', content: message, action: null });
  saveConversationMessages();
  chatInput.value = '';

  const loadingMessage = createLoadingMessage();
  chatMessages.append(loadingMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  setSendingState(true);

  try {
    const reply = await requestSpiritReply(getApiMessages());
    loadingMessage.remove();
    savePendingFlowerFromReply(reply);
    appendSpiritReply(reply.message, reply.action);
    conversationMessages.push({
      role: 'assistant',
      content: reply.message,
      action: normalizeAction(reply.action),
    });
    trimConversationMessages();
    saveConversationMessages();
  } catch (error) {
    const lastMessage = conversationMessages.at(-1);

    if (lastMessage?.role === 'user' && lastMessage.content === message) {
      conversationMessages.pop();
      saveConversationMessages();
    }

    loadingMessage.remove();
    showError(error.message || '花灵暂时没有回应，请稍后再试。');
    chatInput.focus();
  } finally {
    setSendingState(false);
  }
}

renderStoredConversation();

chatForm.addEventListener('submit', handleChatSubmit);

chatMessages.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action="generate-today-flower"]');

  if (!trigger) {
    return;
  }

  window.location.href = 'flower.html';
});
