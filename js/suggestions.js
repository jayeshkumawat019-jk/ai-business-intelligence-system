// js/suggestions.js - AI Business Suggestions UI with Grounded Action Cards & Priority Labels

import { api } from './api.js';
import { ui } from './ui.js';

let suggestionList = [];

export async function mountSuggestions(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>AI Commercial Profitability &amp; Cost Advisory</h1>
        <p>Strategic recommendations synthesized by AI directly from your operational ledgers</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-secondary" id="btn-refresh-suggestions">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Re-Analyze Ledgers
        </button>
      </div>
    </div>

    <!-- AI Intelligence Source Banner -->
    <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1rem 1.25rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <div style="width:36px; height:36px; border-radius:50%; background:var(--status-info-bg); color:var(--status-info-text); display:flex; align-items:center; justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <div>
          <strong style="font-size:0.88rem;">Grounded Decision Intelligence</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);" id="sugg-source-label">Evaluating balance registers...</div>
        </div>
      </div>
      <span class="chip chip-info" style="font-weight:700;">5 Actionable Initiatives</span>
    </div>

    <!-- Suggestions Cards Container -->
    <div id="suggestions-list-grid" style="display:flex; flex-direction:column; gap:1.25rem;">
      <!-- Cards injected here -->
    </div>
  `;

  container.querySelector('#btn-refresh-suggestions').addEventListener('click', loadSuggestions);

  await loadSuggestions();
}

async function loadSuggestions() {
  const grid = document.getElementById('suggestions-list-grid');
  if (grid) {
    grid.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/suggestions');
    suggestionList = res.suggestions || [];

    const sourceLabel = document.getElementById('sugg-source-label');
    if (sourceLabel) {
      sourceLabel.textContent = res.source === 'gemini-intelligence'
        ? `Powered by Google Gemini (${res.model}) &bull; Grounded in real data`
        : `Grounded Rule Engine &bull; Computed from current profit &amp; loss statement`;
    }

    renderCards(suggestionList);
  } catch (err) {
    ui.toast(`Suggestions error: ${err.message}`, 'error');
  }
}

function renderCards(items) {
  const grid = document.getElementById('suggestions-list-grid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">All Systems Optimized</h3>
        <p class="empty-desc">No urgent operational variances detected in current accounting period.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map((item, idx) => {
    let priorityBadge = '<span class="chip chip-info">Opportunity</span>';
    let borderAccent = 'var(--status-info-text)';

    if (item.priority === 'High') {
      priorityBadge = '<span class="chip chip-danger" style="font-weight:700;">🔥 High Priority</span>';
      borderAccent = 'var(--status-danger-text)';
    } else if (item.priority === 'Medium') {
      priorityBadge = '<span class="chip chip-warning">⚡ Medium Priority</span>';
      borderAccent = 'var(--status-warning-text)';
    }

    return `
      <div class="card" style="border-left: 5px solid ${borderAccent}; transition: transform 0.15s ease;">
        <div class="card-header" style="flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.65rem;">
            <div style="width:24px; height:24px; border-radius:var(--radius-full); background:var(--bg-surface-alt); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.75rem;">
              #${idx + 1}
            </div>
            <h3 class="card-title" style="font-size:1rem;">${ui.escapeHtml(item.title)}</h3>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="chip chip-neutral">${ui.escapeHtml(item.category)}</span>
            ${priorityBadge}
          </div>
        </div>

        <div class="card-body">
          <p style="font-size:0.88rem; color:var(--text-primary); line-height:1.5; margin-bottom:1rem;">
            ${ui.escapeHtml(item.action)}
          </p>

          <div style="background:var(--bg-app); padding:0.65rem 1rem; border-radius:var(--radius-sm); display:flex; align-items:center; gap:0.5rem; font-size:0.8rem;">
            <strong style="color:var(--status-success-text);">Estimated Financial Impact:</strong>
            <span style="color:var(--text-secondary);">${ui.escapeHtml(item.impact)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
