// js/ui.js - Shared UI Helpers, Toasts, Modals, Formatters & Animations

export const ui = {
  // 1. SAFE HTML ESCAPING (XSS Prevention)
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  escape(str) {
    return this.escapeHtml(str);
  },

  // 2. CURRENCY & NUMBER FORMATTERS (INR, Lakhs, Crores)
  formatINR(amount) {
    const n = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  },

  formatNumber(val) {
    const n = Number(val) || 0;
    return new Intl.NumberFormat('en-IN').format(n);
  },

  formatCompactINR(val) {
    const num = Math.abs(Number(val) || 0);
    const sign = Number(val) < 0 ? '-' : '';
    if (num >= 10000000) {
      return `${sign}₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `${sign}₹${(num / 100000).toFixed(2)} L`;
    }
    if (num >= 1000) {
      return `${sign}₹${(num / 1000).toFixed(1)} K`;
    }
    return this.formatINR(val);
  },

  formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
      const parts = String(isoStr).slice(0, 10).split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      const d = new Date(isoStr);
      return isNaN(d.getTime()) ? String(isoStr) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(isoStr);
    }
  },

  // 3. TOAST NOTIFICATIONS
  toast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803D" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-message">${this.escapeHtml(message)}</div>
      <button type="button" class="btn-ghost" style="padding:2px; line-height:1;" aria-label="Close">&times;</button>
    `;

    toast.querySelector('button').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 200);
      }
    }, duration);
  },

  // 4. BUTTON LOADING STATE
  setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> <span>${this.escapeHtml(loadingText)}</span>`;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
      }
    }
  },

  // 5. MODAL SYSTEM
  showModal({ title, contentHtml, onConfirm, confirmText = 'Save', cancelText = 'Cancel', size = 'normal' }) {
    const existing = document.getElementById('global-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'global-modal-backdrop';
    backdrop.className = 'modal-backdrop open';

    const maxWidth = size === 'large' ? '820px' : '560px';

    backdrop.innerHTML = `
      <div class="modal-window" style="max-width: ${maxWidth};" role="dialog" aria-modal="true" aria-labelledby="modal-dialog-title">
        <div class="modal-header">
          <h2 id="modal-dialog-title" class="modal-title">${this.escapeHtml(title)}</h2>
          <button type="button" class="modal-close-btn" id="modal-btn-close" aria-label="Close dialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" id="modal-dialog-body">
          ${contentHtml}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modal-btn-cancel">${this.escapeHtml(cancelText)}</button>
          ${onConfirm ? `<button type="button" class="btn btn-primary" id="modal-btn-confirm">${this.escapeHtml(confirmText)}</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeModal = () => {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 200);
    };

    backdrop.querySelector('#modal-btn-close').addEventListener('click', closeModal);
    backdrop.querySelector('#modal-btn-cancel').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    if (onConfirm) {
      const confirmBtn = backdrop.querySelector('#modal-btn-confirm');
      confirmBtn.addEventListener('click', async () => {
        try {
          const shouldClose = await onConfirm(backdrop.querySelector('#modal-dialog-body'), confirmBtn);
          if (shouldClose !== false) closeModal();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      });
    }

    return { backdrop, closeModal };
  },

  // 6. SCROLL ANIMATION OBSERVER
  initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('anim-paused');
        } else {
          entry.target.classList.add('anim-paused');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.dockyard-scene, .anim-crane-trolley, .anim-truck, .anim-cargo-ship, .anim-jcb-boom, .anim-forklift-tines')
      .forEach(el => observer.observe(el));
  }
};

export default ui;
