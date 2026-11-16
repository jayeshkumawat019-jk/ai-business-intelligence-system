// js/assistant.js - AI Business Assistant Chat UI with Grounded Data, Crane Hoist Animation & Typing FX

import { api } from './api.js';
import { ui } from './ui.js';

let chatHistory = [];
let isAssistantThinking = false;

export async function mountAssistant(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>AI Business Intelligence Assistant</h1>
        <p>Grounded in your real database &bull; Ask about revenue, low inventory, customer outstandings &amp; cost cuts</p>
      </div>
    </div>

    <!-- Crane Hoist Thinking & Response Scene -->
    <div class="card" style="margin-bottom: 1.5rem; background:linear-gradient(180deg, #FAF8F4 0%, var(--bg-surface) 100%);">
      <div class="card-header" style="border-bottom:none; padding-bottom:0;">
        <span class="card-subtitle" id="assistant-scene-status">Assistant ready. Ask any business operational question.</span>
      </div>
      <div class="card-body" style="padding:0.5rem 1rem 1rem;">
        <div class="dockyard-scene" style="max-width:320px; height:85px; margin:0 auto; background:none; border-bottom:none;">
          <img src="assets/svg/assistant-scene.svg" id="assistant-svg-scene" class="dockyard-svg" alt="Crane Hoist Assistant">
        </div>
      </div>
    </div>

    <!-- Main Chat Window Card -->
    <div class="card" style="display:flex; flex-direction:column; height:520px; max-width:860px; margin:0 auto;">
      <!-- Suggested Question Chips Bar -->
      <div style="padding:0.75rem 1rem; border-bottom:1px solid var(--border-subtle); display:flex; gap:0.5rem; overflow-x:auto; white-space:nowrap;" id="assistant-chips-bar">
        <button type="button" class="btn btn-secondary btn-sm chip-q" data-q="How is our net profit and margin this financial year?">
          📈 Profit &amp; Margin
        </button>
        <button type="button" class="btn btn-secondary btn-sm chip-q" data-q="Which inventory products are running low and need reorder?">
          📦 Low Stock Items
        </button>
        <button type="button" class="btn btn-secondary btn-sm chip-q" data-q="What are our biggest operational expenses?">
          💸 Cost Centers
        </button>
        <button type="button" class="btn btn-secondary btn-sm chip-q" data-q="Summarize pending customer payments and overdue invoices.">
          ⏳ Pending Collections
        </button>
      </div>

      <!-- Messages Stream Area -->
      <div id="assistant-messages-container" style="flex:1; padding:1.25rem; overflow-y:auto; display:flex; flex-direction:column; gap:1rem;">
        <!-- Initial Welcome Message from Assistant -->
        <div class="chat-msg chat-assistant" style="display:flex; gap:0.75rem; max-width:85%;">
          <div class="user-avatar" style="background:#2563EB; color:#FFFFFF; width:32px; height:32px; flex-shrink:0;">AI</div>
          <div style="background:var(--bg-surface-alt); padding:0.85rem 1.1rem; border-radius:var(--radius-md); font-size:0.85rem; line-height:1.5;">
            Hello! I am your AI Business Assistant. I am connected live to your sales, inventory, and expense registers. Ask me anything about your current finances, stock buffers, or cost reduction strategies!
          </div>
        </div>
      </div>

      <!-- Thinking Indicator Widget -->
      <div id="assistant-thinking-indicator" style="display:none; padding:0.5rem 1.25rem 0.75rem;">
        <div style="display:inline-flex; align-items:center; gap:0.5rem; background:var(--bg-surface-alt); padding:0.4rem 0.85rem; border-radius:var(--radius-full); font-size:0.75rem; color:var(--text-muted);">
          <span>Crane hoisting business ledgers</span>
          <div class="typing-dots">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>
      </div>

      <!-- Input Bar -->
      <div style="padding:1rem; border-top:1px solid var(--border-subtle); background:var(--bg-card);">
        <form id="assistant-input-form" style="display:flex; gap:0.5rem;">
          <input type="text" id="assistant-input-text" class="form-input" placeholder="Ask question about sales, inventory, or expenses..." required autocomplete="off" style="flex:1;">
          <button type="submit" id="assistant-btn-send" class="btn btn-primary">
            <span>Send</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  `;

  // Bind Suggested Question Chips
  container.querySelectorAll('.chip-q').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.q;
      container.querySelector('#assistant-input-text').value = q;
      sendMessage(q);
    });
  });

  const form = container.querySelector('#assistant-input-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = container.querySelector('#assistant-input-text');
    const q = input.value.trim();
    if (q) {
      input.value = '';
      sendMessage(q);
    }
  });
}

async function sendMessage(question) {
  if (isAssistantThinking) return;
  const messagesWrap = document.getElementById('assistant-messages-container');
  const thinkingWidget = document.getElementById('assistant-thinking-indicator');
  const sceneStatus = document.getElementById('assistant-scene-status');
  const hoistScene = document.getElementById('assistant-svg-scene');

  // Append user bubble
  appendMessage('user', question);
  chatHistory.push({ role: 'user', content: question });

  isAssistantThinking = true;
  if (thinkingWidget) thinkingWidget.style.display = 'block';
  if (sceneStatus) sceneStatus.textContent = 'Hoisting real-time business ledgers and consulting AI...';

  // Animate thinking hoist
  if (hoistScene) {
    const group = hoistScene.querySelector('#assistant-hoist-group');
    if (group) {
      group.classList.remove('landed');
      group.classList.add('thinking');
    }
  }

  messagesWrap.scrollTop = messagesWrap.scrollHeight;

  try {
    const res = await api.post('/api/assistant', {
      question,
      history: chatHistory.slice(-10)
    });

    const answer = res.answer || 'No response returned.';
    chatHistory.push({ role: 'assistant', content: answer });

    // Animate landing block when reply appears
    if (hoistScene) {
      const group = hoistScene.querySelector('#assistant-hoist-group');
      if (group) {
        group.classList.remove('thinking');
        group.classList.add('landed');
      }
    }
    if (sceneStatus) sceneStatus.textContent = 'Data block landed & verified from business database.';

    if (thinkingWidget) thinkingWidget.style.display = 'none';

    // Typewriter effect for response
    appendTypewriterMessage(answer);
  } catch (err) {
    if (thinkingWidget) thinkingWidget.style.display = 'none';
    if (sceneStatus) sceneStatus.textContent = 'Query completed with notice.';
    appendMessage('assistant', `⚠️ ${err.message || 'Could not complete assistant request.'}`);
  } finally {
    isAssistantThinking = false;
  }
}

function appendMessage(role, text) {
  const wrap = document.getElementById('assistant-messages-container');
  if (!wrap) return;

  const isUser = role === 'user';
  const row = document.createElement('div');
  row.className = `chat-msg chat-${role}`;
  row.style.cssText = `display:flex; gap:0.75rem; max-width:85%; ${isUser ? 'margin-left:auto; flex-direction:row-reverse;' : ''}`;

  row.innerHTML = `
    <div class="user-avatar" style="background:${isUser ? 'var(--accent-primary)' : '#2563EB'}; color:#FFFFFF; width:32px; height:32px; flex-shrink:0;">
      ${isUser ? 'You' : 'AI'}
    </div>
    <div style="background:${isUser ? 'var(--accent-primary)' : 'var(--bg-surface-alt)'}; color:${isUser ? '#FFFFFF' : 'var(--text-primary)'}; padding:0.85rem 1.1rem; border-radius:var(--radius-md); font-size:0.85rem; line-height:1.5; white-space:pre-wrap;">
      ${ui.escapeHtml(text)}
    </div>
  `;

  wrap.appendChild(row);
  wrap.scrollTop = wrap.scrollHeight;
}

function appendTypewriterMessage(fullText) {
  const wrap = document.getElementById('assistant-messages-container');
  if (!wrap) return;

  const row = document.createElement('div');
  row.className = 'chat-msg chat-assistant';
  row.style.cssText = 'display:flex; gap:0.75rem; max-width:85%;';

  row.innerHTML = `
    <div class="user-avatar" style="background:#2563EB; color:#FFFFFF; width:32px; height:32px; flex-shrink:0;">AI</div>
    <div class="bubble-content" style="background:var(--bg-surface-alt); color:var(--text-primary); padding:0.85rem 1.1rem; border-radius:var(--radius-md); font-size:0.85rem; line-height:1.5; white-space:pre-wrap;"></div>
  `;

  wrap.appendChild(row);
  const bubble = row.querySelector('.bubble-content');

  let idx = 0;
  const speed = 12; // ms per character

  function typeChar() {
    if (idx < fullText.length) {
      bubble.textContent += fullText[idx];
      idx++;
      wrap.scrollTop = wrap.scrollHeight;
      setTimeout(typeChar, speed);
    }
  }

  typeChar();
}
