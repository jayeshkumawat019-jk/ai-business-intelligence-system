// js/router.js - Hash-Based SPA Router for 25 Business Intelligence Modules

import { api } from './api.js';
import { charts } from './charts.js';
import { ui } from './ui.js';

const routes = new Map();
let currentRouteCleanups = [];

export const router = {
  register(path, moduleHandler, meta = {}) {
    routes.set(path, { handler: moduleHandler, meta });
  },

  onCleanup(fn) {
    if (typeof fn === 'function') {
      currentRouteCleanups.push(fn);
    }
  },

  async navigate(hash) {
    const cleanHash = (hash || window.location.hash || '#/dashboard').split('?')[0];

    // Auth Guard
    const isAuth = api.isAuthenticated();
    if (!isAuth && cleanHash !== '#/login') {
      window.location.hash = '#/login';
      return;
    }
    if (isAuth && cleanHash === '#/login') {
      window.location.hash = '#/dashboard';
      return;
    }

    const routeEntry = routes.get(cleanHash) || routes.get('#/dashboard');
    if (!routeEntry) {
      console.warn(`Route ${cleanHash} not found.`);
      return;
    }

    // Run cleanups from previous page
    while (currentRouteCleanups.length > 0) {
      const cleanup = currentRouteCleanups.pop();
      try { cleanup(); } catch (e) {}
    }
    charts.destroyAll();

    // Toggle app layout vs login screen
    const appContainer = document.getElementById('app-container');
    const loginContainer = document.getElementById('login-screen');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (cleanHash === '#/login') {
      if (appContainer) appContainer.style.display = 'none';
      if (loginContainer) loginContainer.style.display = 'flex';
      // Mount login
      await routeEntry.handler(loginContainer);
      return;
    } else {
      if (loginContainer) loginContainer.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
    }

    // Update Sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
      const href = item.getAttribute('href');
      if (href === cleanHash) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    }

    // Update Topbar Title Breadcrumb
    const breadcrumb = document.getElementById('page-breadcrumb');
    if (breadcrumb && routeEntry.meta.title) {
      breadcrumb.textContent = routeEntry.meta.title;
    }

    // Mount View
    const routerView = document.getElementById('router-view');
    if (routerView) {
      routerView.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;padding:4rem;">
          <div class="spinner" style="width:28px;height:28px;"></div>
        </div>
      `;

      try {
        await routeEntry.handler(routerView);
        ui.initScrollAnimations();
        window.scrollTo(0, 0);
      } catch (err) {
        console.error(`Error rendering route ${cleanHash}:`, err);
        routerView.innerHTML = `
          <div class="card" style="padding: 2rem; text-align: center; margin: 2rem auto; max-width: 500px;">
            <h3 style="color:var(--status-danger-text); margin-bottom: 0.5rem;">Failed to load view</h3>
            <p style="color:var(--text-secondary); margin-bottom: 1.5rem;">${ui.escapeHtml(err.message)}</p>
            <button class="btn btn-secondary" onclick="window.location.reload()">Reload Application</button>
          </div>
        `;
      }
    }
  },

  init() {
    window.addEventListener('hashchange', () => {
      this.navigate(window.location.hash);
    });

    // Initial load
    const initialHash = window.location.hash || (api.isAuthenticated() ? '#/dashboard' : '#/login');
    this.navigate(initialHash);
  }
};

export default router;
