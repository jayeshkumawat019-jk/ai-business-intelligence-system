// js/invoices.js - Invoice Generation UI, GST Breakdown, Status Tracking & jsPDF Download

import { api } from './api.js';
import { ui } from './ui.js';

let invoiceList = [];

export async function mountInvoices(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Invoicing &amp; Billing</h1>
        <p>Issue GST-compliant tax invoices, auto-calculate tax slabs &amp; generate official PDF invoices</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-primary" id="btn-create-invoice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Tax Invoice
        </button>
      </div>
    </div>

    <!-- Invoices Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Billing Ledger</h2>
        <div class="filter-search-box">
          <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-input" id="invoices-search-input" placeholder="Search invoice #, customer..." style="padding-left: 2.2rem; font-size: 0.8rem;">
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="invoices-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-create-invoice').addEventListener('click', openCreateInvoiceModal);

  const searchInput = container.querySelector('#invoices-search-input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = invoiceList.filter(inv =>
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(term)) ||
      (inv.customer?.name && inv.customer.name.toLowerCase().includes(term)) ||
      (inv.status && inv.status.toLowerCase().includes(term))
    );
    renderTable(filtered);
  });

  await loadInvoices();
}

async function loadInvoices() {
  const tableWrap = document.getElementById('invoices-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/invoices');
    invoiceList = res.invoices || [];
    renderTable(invoiceList);
  } catch (err) {
    ui.toast(`Failed to load invoices: ${err.message}`, 'error');
  }
}

function renderTable(items) {
  const tableWrap = document.getElementById('invoices-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">No Invoices Generated</h3>
        <p class="empty-desc">Create your first client invoice with automated GST breakdown and PDF export.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Due Date</th>
          <th class="table-col-num">Tax Amount</th>
          <th class="table-col-num">Grand Total</th>
          <th>Status</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(inv => {
          let statusChip = '<span class="chip chip-warning">Pending</span>';
          if (inv.status === 'Paid') statusChip = '<span class="chip chip-success">Paid</span>';
          if (inv.status === 'Overdue') statusChip = '<span class="chip chip-danger">Overdue</span>';

          return `
            <tr data-invoice-id="${inv.id}">
              <td><strong style="font-family:var(--font-mono);">${ui.escapeHtml(inv.invoice_number)}</strong></td>
              <td>${ui.escapeHtml(inv.customer?.name || 'Customer')}</td>
              <td>${ui.formatDate(inv.invoice_date)}</td>
              <td>${ui.formatDate(inv.due_date)}</td>
              <td class="table-col-num">${ui.formatINR(inv.tax_amount)}</td>
              <td class="table-col-num" style="font-weight:700;">${ui.formatINR(inv.grand_total)}</td>
              <td>${statusChip}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button type="button" class="btn btn-secondary btn-sm btn-pdf" data-id="${inv.id}" title="Download Official PDF">
                  PDF
                </button>
                <button type="button" class="btn btn-ghost btn-sm btn-toggle-status" data-id="${inv.id}" data-current="${inv.status}" title="Toggle Paid / Pending">
                  ${inv.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Bind PDF download
  tableWrap.querySelectorAll('.btn-pdf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const inv = invoiceList.find(i => i.id === id);
      if (inv) downloadInvoicePDF(inv);
    });
  });

  // Bind Status toggle
  tableWrap.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const current = e.currentTarget.dataset.current;
      const nextStatus = current === 'Paid' ? 'Pending' : 'Paid';

      try {
        await api.put(`/api/invoices?id=${id}`, { status: nextStatus });
        ui.toast(`Invoice marked as ${nextStatus}.`, 'success');
        loadInvoices();
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });
  });
}

function downloadInvoicePDF(inv) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Primary Colors
    const primaryColor = [28, 25, 23];
    const accentColor = [37, 99, 235];

    // Header Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('AI BUSINESS INTELLIGENCE CORP', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Plot 42, Heavy Industrial MIDC, Taloja, Navi Mumbai - 410208', 14, 26);
    doc.text('GSTIN: 27AABCA9999P1Z8 | Contact: contact@bizintel.in | Web: bizintel.netlify.app', 14, 31);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    // Invoice Title & Meta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...accentColor);
    doc.text('TAX INVOICE', 14, 44);

    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(`Invoice No: ${inv.invoice_number}`, 14, 50);
    doc.text(`Invoice Date: ${ui.formatDate(inv.invoice_date)}`, 14, 55);
    doc.text(`Payment Due: ${ui.formatDate(inv.due_date)}`, 14, 60);

    // Bill To Customer Box
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 120, 44);
    doc.setFont('helvetica', 'normal');
    doc.text(`${inv.customer?.name || 'Valued Customer'}`, 120, 50);
    if (inv.customer?.gst_number) {
      doc.text(`GSTIN: ${inv.customer.gst_number}`, 120, 55);
    }
    doc.text(`${inv.customer?.address || inv.customer?.city || 'India'}`, 120, 60);

    // Line Items AutoTable
    const isInterState = inv.customer?.state && inv.customer.state.toLowerCase() !== 'maharashtra';
    const taxLabel = isInterState ? 'IGST' : 'CGST+SGST';

    const tableRows = (inv.items || []).map((item, idx) => [
      idx + 1,
      item.description,
      item.quantity,
      `INR ${item.unit_price.toFixed(2)}`,
      `INR ${(item.discount || 0).toFixed(2)}`,
      `${item.gst_rate}% ${taxLabel}`,
      `INR ${item.tax_amount.toFixed(2)}`,
      `INR ${item.total.toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 68,
      head: [['#', 'Item Description', 'Qty', 'Unit Rate', 'Discount', 'GST Rate', 'Tax (INR)', 'Total (INR)']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [28, 25, 23], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 8;

    // Totals Block on Right
    doc.setFontSize(9);
    doc.text(`Subtotal:`, 130, finalY);
    doc.text(`INR ${inv.subtotal.toFixed(2)}`, 196, finalY, { align: 'right' });

    doc.text(`Total Discount:`, 130, finalY + 5);
    doc.text(`- INR ${inv.discount.toFixed(2)}`, 196, finalY + 5, { align: 'right' });

    doc.text(`Total Tax (${taxLabel}):`, 130, finalY + 10);
    doc.text(`+ INR ${inv.tax_amount.toFixed(2)}`, 196, finalY + 10, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Grand Total:`, 130, finalY + 17);
    doc.text(`INR ${inv.grand_total.toFixed(2)}`, 196, finalY + 17, { align: 'right' });

    // Amount in words
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Amount in Words: ${inv.amount_in_words || 'Rupees Only'}`, 14, finalY + 12);

    // Terms & Signature
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY + 30, 80, finalY + 30);
    doc.text('Customer Acceptance & Seal', 14, finalY + 35);

    doc.line(130, finalY + 30, 196, finalY + 30);
    doc.text('Authorized Signatory', 130, finalY + 35);

    // Save PDF
    doc.save(`${inv.invoice_number}.pdf`);
    ui.toast(`Downloaded ${inv.invoice_number}.pdf`, 'success');
  } catch (err) {
    ui.toast(`PDF export error: ${err.message}`, 'error');
  }
}

async function openCreateInvoiceModal() {
  let customers = [];
  let products = [];
  try {
    const [cRes, pRes] = await Promise.all([
      api.get('/api/customers'),
      api.get('/api/inventory')
    ]);
    customers = cRes.customers || [];
    products = pRes.products || [];
  } catch (err) {
    ui.toast('Failed to load inventory for invoice generation', 'error');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const contentHtml = `
    <form id="create-invoice-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Client / Customer <span class="required-star">*</span></label>
          <select id="inv-modal-customer" class="form-select" required>
            <option value="">-- Choose Customer --</option>
            ${customers.map(c => `
              <option value="${c.id}" data-state="${c.state || 'Maharashtra'}">
                ${ui.escapeHtml(c.name)} (${c.state || 'Maharashtra'})
              </option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Payment Due Date <span class="required-star">*</span></label>
          <input type="date" id="inv-modal-due" class="form-input" value="${thirtyDaysLater}" required>
        </div>
      </div>

      <div style="margin: 1rem 0 0.5rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:700; font-size:0.85rem;">Line Items</span>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-line-item">+ Add Line Item</button>
      </div>

      <div id="invoice-line-items-container" style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1rem;">
        <!-- Line item rows dynamically injected -->
      </div>

      <!-- Live Calculations Summary -->
      <div style="background-color:var(--bg-app); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.8rem;">
          <span>Subtotal:</span>
          <strong id="live-subtotal">₹ 0.00</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.8rem; color:var(--text-muted);">
          <span id="live-tax-label">GST Tax:</span>
          <strong id="live-tax">₹ 0.00</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; border-top:1px solid var(--border-subtle); padding-top:6px; margin-top:6px;">
          <span>Grand Total:</span>
          <span id="live-grand-total" style="color:var(--status-success-text);">₹ 0.00</span>
        </div>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Generate Tax Invoice',
    contentHtml,
    confirmText: 'Create & Issue Invoice',
    size: 'large',
    onConfirm: async (bodyEl) => {
      const customerId = bodyEl.querySelector('#inv-modal-customer').value;
      const dueDate = bodyEl.querySelector('#inv-modal-due').value;

      if (!customerId || !dueDate) {
        throw new Error('Customer and due date are required.');
      }

      const rows = bodyEl.querySelectorAll('.invoice-item-row');
      const items = [];

      rows.forEach(row => {
        const desc = row.querySelector('.item-desc').value.trim();
        const qty = parseInt(row.querySelector('.item-qty').value, 10);
        const price = parseFloat(row.querySelector('.item-price').value);
        const gstRate = parseFloat(row.querySelector('.item-gst').value);
        const discount = parseFloat(row.querySelector('.item-discount').value) || 0;

        if (desc && qty > 0 && !isNaN(price)) {
          items.push({
            description: desc,
            quantity: qty,
            unit_price: price,
            gst_rate: gstRate,
            discount
          });
        }
      });

      if (items.length === 0) {
        throw new Error('Please add at least one valid invoice item.');
      }

      const res = await api.post('/api/invoices', {
        customer_id: customerId,
        invoice_date: today,
        due_date: dueDate,
        items
      });

      ui.toast(`Invoice ${res.invoice.invoice_number} created successfully!`, 'success');
      loadInvoices();
      return true;
    }
  });

  // Modal setup line items
  const modalEl = document.getElementById('global-modal-backdrop');
  if (modalEl) {
    const itemsContainer = modalEl.querySelector('#invoice-line-items-container');
    const addBtn = modalEl.querySelector('#btn-add-line-item');
    const customerSelect = modalEl.querySelector('#inv-modal-customer');

    const recalculateTotals = () => {
      let subtotal = 0;
      let totalTax = 0;

      modalEl.querySelectorAll('.invoice-item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const discount = parseFloat(row.querySelector('.item-discount').value) || 0;
        const gstRate = parseFloat(row.querySelector('.item-gst').value) || 0;

        const taxable = Math.max(0, (qty * price) - discount);
        const tax = (taxable * gstRate) / 100;

        subtotal += (qty * price);
        totalTax += tax;
      });

      const grandTotal = subtotal + totalTax;
      modalEl.querySelector('#live-subtotal').textContent = ui.formatINR(subtotal);
      modalEl.querySelector('#live-tax').textContent = ui.formatINR(totalTax);
      modalEl.querySelector('#live-grand-total').textContent = ui.formatINR(grandTotal);
    };

    const addRow = () => {
      const row = document.createElement('div');
      row.className = 'invoice-item-row';
      row.style.cssText = 'display:grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto; gap:0.5rem; align-items:center; background:var(--bg-surface-alt); padding:0.5rem; border-radius:var(--radius-sm);';
      row.innerHTML = `
        <input type="text" class="form-input item-desc" placeholder="Item description / SKU" required>
        <input type="number" class="form-input item-qty" placeholder="Qty" min="1" value="1" required>
        <input type="number" class="form-input item-price" placeholder="Rate (₹)" min="0" step="0.01" required>
        <select class="form-select item-gst">
          <option value="18" selected>18% GST</option>
          <option value="12">12% GST</option>
          <option value="5">5% GST</option>
          <option value="28">28% GST</option>
          <option value="0">0% Exempt</option>
        </select>
        <input type="number" class="form-input item-discount" placeholder="Disc ₹" min="0" value="0">
        <button type="button" class="btn-ghost btn-sm btn-remove-row" style="color:var(--status-danger-text); padding:4px;">&times;</button>
      `;

      row.querySelector('.btn-remove-row').addEventListener('click', () => {
        row.remove();
        recalculateTotals();
      });

      row.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', recalculateTotals);
      });

      itemsContainer.appendChild(row);
      recalculateTotals();
    };

    addBtn.addEventListener('click', addRow);
    customerSelect.addEventListener('change', () => {
      const opt = customerSelect.selectedOptions[0];
      const state = opt ? opt.dataset.state : '';
      const isInter = state && state.toLowerCase() !== 'maharashtra';
      modalEl.querySelector('#live-tax-label').textContent = isInter ? 'IGST Tax:' : 'CGST + SGST Tax:';
    });

    // Add first row by default
    addRow();
  }
}
