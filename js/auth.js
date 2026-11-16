// js/auth.js - Login Module & Authentication Flow

import { api } from './api.js';
import { ui } from './ui.js';

export function mountLogin(container) {
  container.innerHTML = `
    <div class="card" style="width: 100%; max-width: 440px; box-shadow: var(--shadow-lg); border-radius: var(--radius-lg);">
      <div style="padding: 2.25rem 2rem 1.5rem; text-align: center;">
        <!-- Industrial Crane Branding Silhouette -->
        <div style="width: 54px; height: 54px; background-color: var(--accent-primary); border-radius: var(--radius-md); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1.25rem; color: #FAF8F4;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="21" x2="21" y2="21"/>
            <line x1="6" y1="21" x2="6" y2="4"/>
            <polygon points="6,4 20,8 6,12"/>
            <line x1="16" y1="7" x2="16" y2="15"/>
            <rect x="13" y="15" width="6" height="5" rx="1"/>
          </svg>
        </div>
        <h1 style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.35rem;">AI Business Intelligence</h1>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">B.Tech Digital Literacy Project &bull; Industrial Management System</p>
      </div>

      <div style="padding: 0 2rem 2rem;">
        <div id="login-error-alert" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-sm); background-color: var(--status-danger-bg); color: var(--status-danger-text); font-size: 0.8rem; margin-bottom: 1.25rem; border: 1px solid rgba(220, 38, 38, 0.2);">
          <!-- Error text dynamically injected -->
        </div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="login-password">System Password</label>
            <div style="position: relative;">
              <input type="password" id="login-password" class="form-input" placeholder="Enter administrator password" required autocomplete="current-password" style="padding-right: 2.75rem;">
              <button type="button" id="btn-toggle-password" style="position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px;" aria-label="Toggle password visibility">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">Default Demo Password: <strong>Admin@BI2026</strong></span>
          </div>

          <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 0.75rem;">
            Sign In to Dashboard
          </button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const passwordInput = container.querySelector('#login-password');
  const toggleBtn = container.querySelector('#btn-toggle-password');
  const submitBtn = container.querySelector('#btn-login-submit');
  const errorAlert = container.querySelector('#login-error-alert');

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAlert.style.display = 'none';
    const pwd = passwordInput.value.trim();
    if (!pwd) return;

    ui.setButtonLoading(submitBtn, true, 'Verifying...');

    try {
      await api.login(pwd);
      ui.toast('Welcome back! Authentication successful.', 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorAlert.textContent = err.message || 'Incorrect password. Please verify and try again.';
      errorAlert.style.display = 'block';
      ui.setButtonLoading(submitBtn, false);
      passwordInput.focus();
    }
  });

  // Focus password input
  setTimeout(() => passwordInput.focus(), 100);
}
