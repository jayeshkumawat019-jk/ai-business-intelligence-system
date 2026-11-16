// js/goals.js - Strategic Business Goals UI with SVG Progress Rings & Celebration FX

import { api } from './api.js';
import { ui } from './ui.js';

let goalsList = [];

export async function mountGoals(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Strategic Business Goal Tracker</h1>
        <p>Set targets for monthly turnover &amp; profit margins &bull; Monitor pace &amp; celebrate milestones</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-primary" id="btn-new-goal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Set New Target
        </button>
      </div>
    </div>

    <!-- Celebration Banner (shown if any goal achieved) -->
    <div id="goal-celebration-banner" style="display:none; margin-bottom:1.5rem; background:linear-gradient(135deg, #15803D 0%, #059669 100%); color:#FFFFFF; padding:1.25rem 1.5rem; border-radius:var(--radius-lg); box-shadow:var(--shadow-md);" class="anim-celebrate">
      <div style="display:flex; align-items:center; gap:1rem;">
        <div style="font-size:2rem;">🎉</div>
        <div>
          <h2 style="font-size:1.15rem; font-weight:800;">Target Accomplished! Commercial Milestone Reached!</h2>
          <p style="font-size:0.82rem; opacity:0.9;">Outstanding team performance! One or more enterprise targets have crossed 100% completion.</p>
        </div>
      </div>
    </div>

    <!-- Goal Cards Grid -->
    <div id="goals-card-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;">
      <!-- Cards dynamically injected -->
    </div>
  `;

  container.querySelector('#btn-new-goal').addEventListener('click', openNewGoalModal);

  await loadGoals();
}

async function loadGoals() {
  const grid = document.getElementById('goals-card-grid');
  if (grid) {
    grid.innerHTML = '<div style="padding: 3rem; text-align: center; grid-column:1/-1;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/goals');
    goalsList = res.goals || [];

    const banner = document.getElementById('goal-celebration-banner');
    if (banner && res.achievedCount > 0) {
      banner.style.display = 'block';
    }

    renderGrid(goalsList);
  } catch (err) {
    ui.toast(`Failed to load goals: ${err.message}`, 'error');
  }
}

function renderGrid(items) {
  const grid = document.getElementById('goals-card-grid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3 class="empty-title">No Active Targets Set</h3>
        <p class="empty-desc">Establish monthly or quarterly sales and profit benchmarks to motivate your organization.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(g => {
    const isAchieved = g.status === 'Achieved!';
    const isBehind = g.status === 'Behind Pace';

    let statusChip = '<span class="chip chip-info">On Track</span>';
    let ringColor = '#2563EB';

    if (isAchieved) {
      statusChip = '<span class="chip chip-success" style="font-weight:700;">★ Achieved!</span>';
      ringColor = '#059669';
    } else if (isBehind) {
      statusChip = '<span class="chip chip-danger">Behind Expected Pace</span>';
      ringColor = '#DC2626';
    }

    // SVG Circular Progress Ring Calculations (Radius: 40, Circumference: 2 * PI * 40 ~= 251.32)
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, g.percentage) / 100) * circumference;

    return `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; ${isAchieved ? 'border:2px solid #059669;' : ''}">
        <div class="card-header">
          <div>
            <h3 class="card-title" style="font-size:0.95rem;">${ui.escapeHtml(g.title)}</h3>
            <span class="card-subtitle">${ui.formatDate(g.period_start)} &rarr; ${ui.formatDate(g.period_end)}</span>
          </div>
          <div>${statusChip}</div>
        </div>

        <div class="card-body">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
            <!-- Circular Progress Ring -->
            <div style="position:relative; width:94px; height:94px; flex-shrink:0;">
              <svg width="94" height="94" viewBox="0 0 94 94">
                <circle cx="47" cy="47" r="${radius}" fill="none" stroke="var(--bg-surface-alt)" stroke-width="8"/>
                <circle cx="47" cy="47" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="8"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round"
                  transform="rotate(-90 47 47)" style="transition: stroke-dashoffset 0.8s ease;"/>
              </svg>
              <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <span style="font-size:1.05rem; font-weight:800; line-height:1;">${g.percentage}%</span>
              </div>
            </div>

            <!-- Target Values Breakdown -->
            <div style="flex:1; padding-left:1.25rem; font-size:0.82rem;">
              <div style="color:var(--text-muted); margin-bottom:2px;">Metric: <strong style="color:var(--text-primary); text-transform:uppercase;">${g.metric}</strong></div>
              <div style="color:var(--text-muted); margin-bottom:4px;">Target: <strong>${ui.formatINR(g.target_amount)}</strong></div>
              <div style="color:var(--text-muted);">Achieved: <strong style="color:${isAchieved ? 'var(--status-success-text)' : 'var(--text-primary)'}; font-size:1rem;">${ui.formatINR(g.achieved_amount)}</strong></div>
            </div>
          </div>

          <div style="background:var(--bg-app); padding:0.65rem 0.85rem; border-radius:var(--radius-sm); font-size:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <span>Days Remaining: <strong>${g.days_remaining} days</strong></span>
            <span>Target Pace: <strong>${ui.formatINR(g.expected_pace_amount)}</strong></span>
          </div>
        </div>

        <div class="card-header" style="background:transparent; border-top:1px solid var(--border-subtle); border-bottom:none; padding:0.65rem 1.25rem;">
          <span style="font-size:0.72rem; color:var(--text-muted);">${ui.escapeHtml(g.notes || 'Strategic objective')}</span>
          <button type="button" class="btn-ghost btn-sm btn-delete-goal" data-id="${g.id}" title="Delete Target" style="padding:2px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.btn-delete-goal').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Delete this goal benchmark?')) {
        try {
          await api.delete('/api/goals', { id });
          ui.toast('Goal benchmark removed.', 'success');
          loadGoals();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function openNewGoalModal() {
  const currentMonthStart = '2026-11-01';
  const currentMonthEnd = '2026-11-30';

  const contentHtml = `
    <form id="new-goal-form">
      <div class="form-group">
        <label class="form-label">Goal Title <span class="required-star">*</span></label>
        <input type="text" id="ng-title" class="form-input" placeholder="e.g. Q4 2026 Turnaround Milestone" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Performance Metric <span class="required-star">*</span></label>
          <select id="ng-metric" class="form-select" required>
            <option value="sales" selected>Gross Sales Revenue</option>
            <option value="profit">Net Operating Profit</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Target Amount (₹) <span class="required-star">*</span></label>
          <input type="number" id="ng-amount" class="form-input" min="1000" step="5000" placeholder="e.g. 1500000" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Period Start <span class="required-star">*</span></label>
          <input type="date" id="ng-start" class="form-input" value="${currentMonthStart}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Period End <span class="required-star">*</span></label>
          <input type="date" id="ng-end" class="form-input" value="${currentMonthEnd}" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Strategic Notes</label>
        <textarea id="ng-notes" class="form-textarea" rows="2" placeholder="Key initiatives to hit this number..."></textarea>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Establish Strategic Target',
    contentHtml,
    confirmText: 'Activate Goal',
    onConfirm: async (bodyEl) => {
      const title = bodyEl.querySelector('#ng-title').value.trim();
      const metric = bodyEl.querySelector('#ng-metric').value;
      const target_amount = parseFloat(bodyEl.querySelector('#ng-amount').value);
      const period_start = bodyEl.querySelector('#ng-start').value;
      const period_end = bodyEl.querySelector('#ng-end').value;
      const notes = bodyEl.querySelector('#ng-notes').value.trim();

      if (!title || isNaN(target_amount) || target_amount <= 0 || !period_start || !period_end) {
        throw new Error('Please fill in all target parameters.');
      }

      await api.post('/api/goals', {
        title,
        metric,
        target_amount,
        period_start,
        period_end,
        notes
      });

      ui.toast('New business goal activated!', 'success');
      loadGoals();
      return true;
    }
  });
}
