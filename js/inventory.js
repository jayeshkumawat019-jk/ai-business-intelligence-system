// js/inventory.js - Inventory Management UI with Stock vs Reorder Chart, Shortage Badges & Crane Animation

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let productList = [];
let movementList = [];

export async function mountInventory(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Inventory &amp; Warehousing</h1>
        <p>Monitor real-time warehouse stock, replenishment thresholds &amp; inbound/outbound movements</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-secondary" id="btn-stock-movement">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Stock In / Out
        </button>
        <button type="button" class="btn btn-primary" id="btn-new-product">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add SKU / Product
        </button>
      </div>
    </div>

    <!-- Dockyard Animated Scene: Tower Crane Lifting Container -->
    <div class="dockyard-scene" title="Dockyard Gantry Crane Stacking Cargo Containers">
      <img src="assets/svg/crane.svg" class="dockyard-svg" alt="Tower Crane Lifting Container">
    </div>

    <!-- KPI Summary Row -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Total SKUs</span>
          <div class="kpi-icon-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="inv-total-skus">-</div>
        <div class="kpi-footer">Active catalog items</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Inventory Valuation</span>
          <div class="kpi-icon-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="inv-total-valuation">-</div>
        <div class="kpi-footer">At procurement cost</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Critical Shortages</span>
          <div class="kpi-icon-pill" style="color:var(--status-danger-text); background-color:var(--status-danger-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-danger-text);" id="inv-low-count">-</div>
        <div class="kpi-footer">At or below reorder level</div>
      </div>
    </div>

    <!-- Stock vs Reorder Level Chart Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title">Stock vs Reorder Thresholds</h2>
          <span class="card-subtitle">Comparison of on-hand inventory against safety buffers</span>
        </div>
      </div>
      <div class="card-body">
        <div id="inventory-bar-chart" style="height: 280px; position: relative;">
          <!-- Chart -->
        </div>
      </div>
    </div>

    <!-- Inventory Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Product Catalog</h2>
        <div class="filter-search-box">
          <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-input" id="inventory-search-input" placeholder="Search SKU, item name..." style="padding-left: 2.2rem; font-size: 0.8rem;">
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="inventory-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-new-product').addEventListener('click', openNewProductModal);
  container.querySelector('#btn-stock-movement').addEventListener('click', openStockMovementModal);

  const searchInput = container.querySelector('#inventory-search-input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = productList.filter(p =>
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
    renderTable(filtered);
  });

  await loadInventory();
}

async function loadInventory() {
  const tableWrap = document.getElementById('inventory-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/inventory');
    productList = res.products || [];
    movementList = res.movements || [];

    document.getElementById('inv-total-skus').textContent = res.totalSKUs || 0;
    document.getElementById('inv-total-valuation').textContent = ui.formatINR(res.totalValuation || 0);
    document.getElementById('inv-low-count').textContent = res.lowStockCount || 0;

    renderChart();
    renderTable(productList);
  } catch (err) {
    ui.toast(`Failed to load inventory: ${err.message}`, 'error');
  }
}

function renderChart() {
  const topItems = productList.slice(0, 10);
  charts.bar('inventory-bar-chart', {
    labels: topItems.map(p => p.sku),
    datasets: [
      {
        label: 'Current On-Hand Stock',
        data: topItems.map(p => p.stock),
        backgroundColor: '#2563EB'
      },
      {
        label: 'Reorder Buffer Level',
        data: topItems.map(p => p.reorder_level),
        backgroundColor: '#DC2626'
      }
    ]
  });
}

function renderTable(items) {
  const tableWrap = document.getElementById('inventory-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">Catalog Empty</h3>
        <p class="empty-desc">Create your first inventory SKU to begin tracking stock.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Product Name</th>
          <th>Category</th>
          <th class="table-col-num">Cost Price</th>
          <th class="table-col-num">Selling Price</th>
          <th class="table-col-num">On Hand</th>
          <th class="table-col-num">Reorder</th>
          <th>Status</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(p => {
          let statusBadge = '<span class="chip chip-success">Healthy</span>';
          if (p.status === 'Critical Low' || p.status === 'Out of Stock') {
            statusBadge = `<span class="chip chip-danger">${p.status}</span>`;
          } else if (p.status === 'Warning') {
            statusBadge = '<span class="chip chip-warning">Warning</span>';
          }

          return `
            <tr data-product-id="${p.id}">
              <td style="font-family:var(--font-mono); font-weight:700;">${ui.escapeHtml(p.sku)}</td>
              <td><strong>${ui.escapeHtml(p.name)}</strong></td>
              <td><span class="chip chip-neutral">${ui.escapeHtml(p.category)}</span></td>
              <td class="table-col-num">${ui.formatINR(p.cost_price)}</td>
              <td class="table-col-num" style="font-weight:700;">${ui.formatINR(p.selling_price)}</td>
              <td class="table-col-num" style="font-weight:700; ${p.stock <= p.reorder_level ? 'color:var(--status-danger-text);' : ''}">${p.stock} ${ui.escapeHtml(p.unit || 'pcs')}</td>
              <td class="table-col-num">${p.reorder_level}</td>
              <td>${statusBadge}</td>
              <td style="text-align:right;">
                <button type="button" class="btn-ghost btn-sm btn-delete-product" data-id="${p.id}" title="Delete SKU">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  tableWrap.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Delete this product from catalog? Any linked historical sales will keep their records.')) {
        try {
          await api.delete('/api/inventory', { id });
          ui.toast('Product deleted.', 'success');
          loadInventory();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function openNewProductModal() {
  const contentHtml = `
    <form id="new-product-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">SKU Code <span class="required-star">*</span></label>
          <input type="text" id="np-sku" class="form-input" placeholder="e.g. IND-VLV-01" required style="text-transform:uppercase;">
        </div>
        <div class="form-group">
          <label class="form-label">Category <span class="required-star">*</span></label>
          <input type="text" id="np-category" class="form-input" placeholder="e.g. Hydraulics, Valves, Fasteners" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Item / Product Name <span class="required-star">*</span></label>
        <input type="text" id="np-name" class="form-input" placeholder="e.g. Cast Iron Gate Valve DN80" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Cost Price (₹) <span class="required-star">*</span></label>
          <input type="number" id="np-cost" class="form-input" min="0" step="0.01" placeholder="0.00" required>
        </div>
        <div class="form-group">
          <label class="form-label">Selling Price (₹) <span class="required-star">*</span></label>
          <input type="number" id="np-selling" class="form-input" min="0" step="0.01" placeholder="0.00" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Initial Stock <span class="required-star">*</span></label>
          <input type="number" id="np-stock" class="form-input" min="0" value="0" required>
        </div>
        <div class="form-group">
          <label class="form-label">Reorder Alert Level <span class="required-star">*</span></label>
          <input type="number" id="np-reorder" class="form-input" min="0" value="10" required>
        </div>
        <div class="form-group">
          <label class="form-label">Unit of Measure</label>
          <select id="np-unit" class="form-select">
            <option value="pcs" selected>Pieces (pcs)</option>
            <option value="box">Box (box)</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="m">Meter (m)</option>
            <option value="reel">Reel (reel)</option>
            <option value="kit">Kit (kit)</option>
          </select>
        </div>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Add New Product SKU',
    contentHtml,
    confirmText: 'Save Product',
    onConfirm: async (bodyEl) => {
      const sku = bodyEl.querySelector('#np-sku').value.trim().toUpperCase();
      const name = bodyEl.querySelector('#np-name').value.trim();
      const category = bodyEl.querySelector('#np-category').value.trim();
      const cost_price = parseFloat(bodyEl.querySelector('#np-cost').value);
      const selling_price = parseFloat(bodyEl.querySelector('#np-selling').value);
      const stock = parseInt(bodyEl.querySelector('#np-stock').value, 10);
      const reorder_level = parseInt(bodyEl.querySelector('#np-reorder').value, 10);
      const unit = bodyEl.querySelector('#np-unit').value;

      if (!sku || !name || !category || isNaN(cost_price) || isNaN(selling_price)) {
        throw new Error('Please fill in all required fields.');
      }

      await api.post('/api/inventory', {
        sku,
        name,
        category,
        cost_price,
        selling_price,
        stock,
        reorder_level,
        unit
      });

      ui.toast('New product registered successfully.', 'success');
      loadInventory();
      return true;
    }
  });
}

function openStockMovementModal() {
  const contentHtml = `
    <form id="stock-movement-form">
      <div class="form-group">
        <label class="form-label">Select SKU / Product <span class="required-star">*</span></label>
        <select id="sm-product" class="form-select" required>
          <option value="">-- Choose Product --</option>
          ${productList.map(p => `<option value="${p.id}">${ui.escapeHtml(p.name)} [SKU: ${p.sku}] (Current: ${p.stock})</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Movement Type <span class="required-star">*</span></label>
          <select id="sm-type" class="form-select" required>
            <option value="in" selected>Stock IN (Inbound / Receipt / Return)</option>
            <option value="out">Stock OUT (Damage / Scrap / Manual Dispatch)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Quantity <span class="required-star">*</span></label>
          <input type="number" id="sm-quantity" class="form-input" min="1" value="1" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Reason / Reference Note <span class="required-star">*</span></label>
        <input type="text" id="sm-reason" class="form-input" placeholder="e.g. Warehouse batch count adjustment, damaged carton" required>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Manual Stock In / Out Adjustment',
    contentHtml,
    confirmText: 'Commit Adjustment',
    onConfirm: async (bodyEl) => {
      const productId = bodyEl.querySelector('#sm-product').value;
      const type = bodyEl.querySelector('#sm-type').value;
      const quantity = parseInt(bodyEl.querySelector('#sm-quantity').value, 10);
      const reason = bodyEl.querySelector('#sm-reason').value.trim();

      if (!productId || !type || !quantity || !reason) {
        throw new Error('Please fill in all adjustment fields.');
      }

      await api.post('/api/inventory', {
        action: 'movement',
        product_id: productId,
        type,
        quantity,
        reason
      });

      ui.toast('Stock adjustment recorded successfully.', 'success');
      loadInventory();
      return true;
    }
  });
}
