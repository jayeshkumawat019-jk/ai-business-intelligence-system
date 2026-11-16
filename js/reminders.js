// js/reminders.js - Business Reminders UI with Holiday Warnings & Task Completion

import { api } from './api.js';
import { ui } from './ui.js';

let reminderList = [];
let currentFilter = 'all'; // 'all' | 'upcoming' | 'overdue' | 'completed'

export async function mountReminders(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Statutory &amp; Financial Reminders</h1>
        <p>Keep track of payment schedules, GST return dates &amp; get alerts when due dates clash with public holidays</p>
      </div>
      <div class="filter-actions-row">
        <div class="btn-group" style="display:inline-flex; border:1px solid var(--border-strong); border-radius:var(--radius-sm); overflow:hidden;">
          <button type="button" class="btn btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-ghost'}" id="rf-all">All</button>
          <button type="button" class="btn btn-sm ${currentFilter === 'upcoming' ? 'btn-primary' : 'btn-ghost'}" id="rf-upcoming">Upcoming</button>
          <button type="button" class="btn btn-sm ${currentFilter === 'overdue' ? 'btn-primary' : 'btn-ghost'}" id="rf-overdue">Overdue</button>
          <button type="button" class="btn btn-sm ${currentFilter === 'completed' ? 'btn-primary' : 'btn-ghost'}" id="rf-completed">Completed</button>
        </div>
        <button type="button" class="btn btn-primary" id="btn-new-reminder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Reminder
        </button>
      </div>
    </div>

    <!-- Reminders List Card -->
    <div class="card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Reminders Checklist</h2>
          <span class="card-subtitle" id="rem-counts-sub">Checking statutory deadlines...</span>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div id="reminders-list-wrapper">
          <!-- Injected items -->
        </div>
      </div>
    </div>
  `;

  container.querySelector('#rf-all').addEventListener('click', () => switchTab('all'));
  container.querySelector('#rf-upcoming').addEventListener('click', () => switchTab('upcoming'));
  container.querySelector('#rf-overdue').addEventListener('click', () => switchTab('overdue'));
  container.querySelector('#rf-completed').addEventListener('click', () => switchTab('completed'));

  container.querySelector('#btn-new-reminder').addEventListener('click', openNewReminderModal);

  await loadReminders();
}

function switchTab(tab) {
  currentFilter = tab;
  document.querySelectorAll('#rf-all, #rf-upcoming, #rf-overdue, #rf-completed').forEach(btn => {
    btn.className = `btn btn-sm ${btn.id === `rf-${tab}` ? 'btn-primary' : 'btn-ghost'}`;
  });
  renderList();
}

async function loadReminders() {
  const wrap = document.getElementById('reminders-list-wrapper');
  if (wrap) {
    wrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/reminders');
    reminderList = res.reminders || [];

    // Update Topbar pill
    const topbarPill = document.getElementById('topbar-reminders-pill');
    const topbarCount = document.getElementById('topbar-reminders-count');
    if (res.overdueCount > 0) {
      if (topbarPill) topbarPill.style.display = 'inline-flex';
      if (topbarCount) topbarCount.textContent = `${res.overdueCount} overdue`;
    } else if (res.pendingCount > 0) {
      if (topbarPill) topbarPill.style.display = 'inline-flex';
      if (topbarCount) topbarCount.textContent = `${res.pendingCount} due`;
    } else {
      if (topbarPill) topbarPill.style.display = 'none';
    }

    document.getElementById('rem-counts-sub').textContent =
      `${res.pendingCount} active tasks (${res.overdueCount} overdue action items)`;

    renderList();
  } catch (err) {
    ui.toast(`Failed to load reminders: ${err.message}`, 'error');
  }
}

function renderList() {
  const wrap = document.getElementById('reminders-list-wrapper');
  if (!wrap) return;

  let items = reminderList;
  if (currentFilter === 'upcoming') {
    items = items.filter(r => !r.is_done && !r.is_overdue);
  } else if (currentFilter === 'overdue') {
    items = items.filter(r => r.is_overdue);
  } else if (currentFilter === 'completed') {
    items = items.filter(r => r.is_done);
  }

  if (items.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">No Reminders in this View</h3>
        <p class="empty-desc">You are all caught up on scheduled business obligations.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div style="display:flex; flex-direction:column;">
      ${items.map(r => {
        let priorityChip = '<span class="chip chip-neutral">Normal</span>';
        if (r.priority === 'high' || r.is_overdue) {
          priorityChip = '<span class="chip chip-danger">High Priority</span>';
        } else if (r.priority === 'medium') {
          priorityChip = '<span class="chip chip-warning">Medium</span>';
        }

        return `
          <div style="display:flex; align-items:flex-start; gap:1rem; padding:1.25rem 1.5rem; border-bottom:1px solid var(--border-subtle); background:${r.is_done ? 'rgba(0,0,0,0.02)' : 'transparent'};">
            <input type="checkbox" class="toggle-done-chk" data-id="${r.id}" ${r.is_done ? 'checked' : ''} style="margin-top:4px; width:18px; height:18px; cursor:pointer;" title="Mark Completed">
            
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.25rem;">
                <strong style="font-size:0.92rem; ${r.is_done ? 'text-decoration:line-through; opacity:0.6;' : ''}">
                  ${ui.escapeHtml(r.title)}
                </strong>
                ${priorityChip}
                <span class="chip chip-info" style="font-size:0.68rem;">${ui.escapeHtml(r.type)}</span>
                ${r.is_overdue ? '<span class="chip chip-danger" style="font-weight:700;">OVERDUE</span>' : ''}
              </div>

              ${r.notes ? `<p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.35rem;">${ui.escapeHtml(r.notes)}</p>` : ''}

              <!-- Public Holiday Warning Pill -->
              ${r.holiday_warning ? `
                <div style="display:inline-flex; align-items:center; gap:4px; background:var(--status-warning-bg); color:var(--status-warning-text); border:1px solid rgba(217, 119, 6, 0.3); border-radius:var(--radius-sm); padding:0.2rem 0.5rem; font-size:0.72rem; font-weight:600; margin-top:0.2rem;">
                  <span>⚠️</span>
                  <span>Notice: Due date coincides with ${ui.escapeHtml(r.holiday_warning)}. Public banks &amp; offices may be shut.</span>
                </div>
              ` : ''}

              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.35rem;">
                Due Date: <strong>${ui.formatDate(r.due_date)}</strong>
              </div>
            </div>

            <button type="button" class="btn-ghost btn-sm btn-delete-rem" data-id="${r.id}" title="Delete Reminder">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Bind checkbox toggle
  wrap.querySelectorAll('.toggle-done-chk').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      const id = e.currentTarget.dataset.id;
      const is_done = e.currentTarget.checked;
      try {
        await api.put(`/api/reminders?id=${id}`, { is_done });
        ui.toast(is_done ? 'Reminder marked as finished!' : 'Reminder reopened.', 'success');
        loadReminders();
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });
  });

  // Bind delete button
  wrap.querySelectorAll('.btn-delete-rem').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Delete this reminder?')) {
        try {
          await api.delete('/api/reminders', { id });
          ui.toast('Reminder deleted.', 'success');
          loadReminders();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function openNewReminderModal() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const contentHtml = `
    <form id="new-reminder-form">
      <div class="form-group">
        <label class="form-label">Reminder Title / Obligation <span class="required-star">*</span></label>
        <input type="text" id="nr-title" class="form-input" placeholder="e.g. Settle Parker Hannifin supplier invoice" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Classification <span class="required-star">*</span></label>
          <select id="nr-type" class="form-select" required>
            <option value="payment">Payment Collection</option>
            <option value="bill">Bill / Supplier Payment</option>
            <option value="tax">Tax / GST Filing</option>
            <option value="deadline">Operational Deadline</option>
            <option value="compliance">Statutory Compliance</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority Level <span class="required-star">*</span></label>
          <select id="nr-priority" class="form-select" required>
            <option value="high">High (Urgent)</option>
            <option value="medium" selected>Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Due Date <span class="required-star">*</span></label>
        <input type="date" id="nr-date" class="form-input" value="${tomorrow}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Detailed Notes</label>
        <textarea id="nr-notes" class="form-textarea" rows="2" placeholder="Reference invoice, cheque numbers or contact particulars..."></textarea>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Schedule Business Reminder',
    contentHtml,
    confirmText: 'Save Reminder',
    onConfirm: async (bodyEl) => {
      const title = bodyEl.querySelector('#nr-title').value.trim();
      const type = bodyEl.querySelector('#nr-type').value;
      const priority = bodyEl.querySelector('#nr-priority').value;
      const due_date = bodyEl.querySelector('#nr-date').value;
      const notes = bodyEl.querySelector('#nr-notes').value.trim();

      if (!title || !due_date) {
        throw new Error('Please fill in title and due date.');
      }

      await api.post('/api/reminders', {
        title,
        type,
        priority,
        due_date,
        notes
      });

      ui.toast('Reminder scheduled successfully.', 'success');
      loadReminders();
      return true;
    }
  });
}
