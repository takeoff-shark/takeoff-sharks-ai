// public/app.js
// Minimal, robust frontend to work with /api/chat backend
// Ensure IDs: #input, #send, #messages, #composer exist in HTML

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');
const openChat = document.getElementById('openChat');
const clearBtn = document.getElementById('clearBtn');
const chips = document.querySelectorAll('.chip');
let history = []; // keep last messages for context

function renderMarkdown(md) {
  // basic markdown: convert newlines to <br>, simple links - keep lightweight
  if(!md) return '';
  // escape HTML
  const esc = md.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  // convert links [text](url)
  const linked = esc.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return linked.replace(/\n/g, '<br>');
}

function pushMessage(role, content) {
  const el = document.createElement('div');
  el.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
  el.innerHTML = `<div class="md">${renderMarkdown(content)}</div>`;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function replaceLastBot(content) {
  const bots = messagesEl.querySelectorAll('.msg.bot');
  const last = bots[bots.length - 1];
  if (last) last.querySelector('.md').innerHTML = renderMarkdown(content);
}

// Welcome message (site-specific + backlink + keyword)
pushMessage('bot',
  "Welcome to TakeoffSharks AI — Construction Estimating Service Assistant\n\n" +
  "🔗 https://takeoffsharks.us/ for detailed insights.\n" +
  "📌 Explore our Estimating Services to boost your next project.\n\n" +
  "Ask me anything from quantity estimates to waste percentages and get reliable guidance in seconds."
);


// wire chips
chips.forEach(c => c.addEventListener('click', () => {
  const p = c.dataset.prompt;
  if (inputEl) { inputEl.value = p; inputEl.focus(); }
}));

// open chat button focuses input
if (openChat) {
  openChat.addEventListener('click', () => { inputEl.focus(); });
}

// clear history
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    history = [];
    messagesEl.innerHTML = '';
    pushMessage('bot', '**Conversation cleared.** Start a new estimate or paste specs.');
  });
}

let sending = false;

async function sendToServer(msg) {
  const payload = { message: msg, history };
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || 'API error');
  }
  const j = await res.json();
  return j.reply;
}

async function handleSend() {
  if (sending) return;
  const text = (inputEl.value || '').trim();
  if (!text) return;
  // push user
  pushMessage('user', text);
  history.push({ role: 'user', content: text });
  inputEl.value = '';
  // placeholder bot typing
  pushMessage('bot', '_Working on your estimate..._');
  sending = true;
  sendBtn.disabled = true;
  try {
    const reply = await sendToServer(text);
    replaceLastBot(reply);
    history.push({ role: 'assistant', content: reply });
  } catch (err) {
    console.error(err);
    replaceLastBot('Error: unable to reach service. Please check server or API key.');
  } finally {
    sending = false;
    sendBtn.disabled = false;
  }
}

// events
if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (inputEl) inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
