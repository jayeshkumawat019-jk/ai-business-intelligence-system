// js/lowStock.js - Low Stock Inventory Alerts UI with Replenishment Formulas & Forklift Animation

import { api } from './api.js';
import { ui } from './ui.js';

let alertItems = [];

export async function mountLowStock(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Critical Stock Alerts &amp; Replenishment</h1>
        <p>Products at or below safety reorder threshold with automatic purchase order sizing based on sales run-rate</p>
      </div>
      <div class="filter-actions-row">
        <a href="#/suppliers" class="btn btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          Create Vendor Purchase Order
        </a>
      </div>
    </div>

    <!-- Dockyard Animated Scene: Forklift Carrying Pallet Boxes -->
    <div class="dockyard-scene" title="Warehouse Stacker: Forklift Moving Pallet Boxes">
      <img src="assets/svg/forklift.svg" class="dockyard-svg" alt="Forklift Stacking Low Stock Pallets">
    </div>

    <!-- Alert Items List Card -->
    <div class="card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Replenishment Watchlist</h2>
          <span class="card-subtitle" id="alert-summary-sub">Inspecting warehouse threshold registers...</span>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="low-stock-table-wrapper">
          <!-- Injected Table -->
        </div>
      </div>
    </div>
  `;

  await loadLowStock();
}

async function loadLowStock() {
  const tableWrap = document.getElementById('low-stock-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/low-stock');
    alertItems = res.lowStockItems || [];

    // Update Topbar and Sidebar badges dynamically
    const topbarPill = document.getElementById('topbar-lowstock-pill');
    const topbarCount = document.getElementById('topbar-lowstock-count');
    const sidebarBadge = document.getElementById('sidebar-lowstock-badge');

    if (res.badgeCount > 0) {
      if (topbarPill) topbarPill.style.display = 'inline-flex';
      if (topbarCount) topbarCount.textContent = `${res.badgeCount} items low`;
      if (sidebarBadge) {
        sidebarBadge.textContent = res.badgeCount;
        sidebarBadge.style.display = 'inline-block';
      }
    } else {
      if (topbarPill) topbarPill.style.display = 'none';
      if (sidebarBadge) sidebarBadge.style.display = 'none';
    }

    document.getElementById('alert-summary-sub').textContent =
      `${res.badgeCount} SKUs require reordering (${res.criticalCount} critical shortages)`;

    renderTable(alertItems);
  } catch (err) {
    ui.toast(`Alerts error: ${err.message}`, 'error');
  }
}

function renderTable(items) {
  const tableWrap = document.getElementById('low-stock-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title" style="color:var(--status-success-text);">All Stock Levels Healthy!</h3>
        <p class="empty-desc">No products are currently below their reorder threshold buffer.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>SKU / Product</th>
          <th>Severity Status</th>
          <th class="table-col-num">On-Hand Stock</th>
          <th class="table-col-num">Safety Buffer</th>
          <th class="table-col-num">30-Day Sales Run</th>
          <th class="table-col-num">Suggested Restock Qty</th>
          <th style="text-align:right;">Quick Action</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => {
          const isCritical = item.severity === 'critical';
          const chipClass = isCritical ? 'chip-danger' : 'chip-warning';

          return `
            <tr data-item-id="${item.id}">
              <td>
                <strong style="font-size:0.9rem;">${ui.escapeHtml(item.name)}</strong>
                <div style="font-size:0.72rem; color:var(--text-muted); font-family:var(--font-mono);">
                  SKU: ${ui.escapeHtml(item.sku)} &bull; ${ui.escapeHtml(item.category)}
                </div>
              </td>
              <td><span class="chip ${chipClass}">${item.severityLabel}</span></td>
              <td class="table-col-num" style="font-weight:800; color:${isCritical ? 'var(--status-danger-text)' : 'var(--status-warning-text)'};">
                ${item.stock} ${ui.escapeHtml(item.unit)}
              </td>
              <td class="table-col-num">${item.reorder_level} ${ui.escapeHtml(item.unit)}</td>
              <td class="table-col-num">
                ${item.sales30d} units (${item.dailyVelocity}/day)
              </td>
              <td class="table-col-num" style="font-weight:700; color:var(--status-info-text);">
                +${item.suggestedRestock} ${ui.escapeHtml(item.unit)}
              </td>
              <td style="text-align:right;">
                <button type="button" class="btn btn-secondary btn-sm btn-quick-stock" data-id="${item.id}" data-name="${ui.escapeHtml(item.name)}" data-unit="${item.unit}" data-sugg="${item.suggestedRestock}">
                  + Receive Stock
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  tableWrap.querySelectorAll('.btn-quick-stock').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const name = e.currentTarget.dataset.name;
      const unit = e.currentTarget.dataset.unit;
      const sugg = e.currentTarget.dataset.sugg;
      openQuickReceiveModal(id, name, unit, sugg);
    });
  });
}

function openQuickReceiveModal(productId, productName, unit, suggestedQty) {
  const contentHtml = `
    <div style="margin-bottom:1rem; padding:0.75rem 1rem; background:var(--bg-app); border-radius:var(--radius-sm);">
      <div style="font-size:0.85rem;">Product: <strong>${ui.escapeHtml(productName)}</strong></div>
      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Suggested procurement batch: <strong>${suggestedQty} ${unit}</strong></div>
    </div>
    <form id="quick-receive-form">
      <div class="form-group">
        <label class="form-label">Quantity to Add to Warehouse <span class="required-star">*</span></label>
        <input type="number" id="qr-qty" class="form-input" min="1" value="${suggestedQty}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Receipt Note / GRN Reference <span class="required-star">*</span></label>
        <input type="text" id="qr-ref" class="form-input" value="Replenishment batch per low stock alert" required>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Receive Replenishment Shipment',
    contentHtml,
    confirmText: 'Acknowledge Stock Receipt',
    onConfirm: async (bodyEl) => {
      const qty = parseInt(bodyEl.querySelector('#qr-qty').value, 10);
      const reason = bodyEl.querySelector('#qr-ref').value.trim();

      if (isNaN(qty) || qty <= 0 || !reason) {
        throw new Error('Please fill in valid quantity and reference details.');
      }

      await api.post('/api/inventory', {
        action: 'movement',
        product_id: productId,
        type: 'in',
        quantity: qty,
        reason
      });

      ui.toast(`Added ${qty} ${unit} to warehouse stock for ${productName}.`, 'success');
      loadLowStock();
      return true;
    }
  });
}
