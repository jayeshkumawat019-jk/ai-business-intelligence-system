// js/app.js - Main Client Application Entrypoint
// Registers all 25 Business Intelligence modules + Login flow & Shell interactions

import router from './router.js';
import api from './api.js';
import ui from './ui.js';

import { mountLogin } from './auth.js';
import { mountDashboard } from './dashboard.js';
import { mountAssistant } from './assistant.js';
import { mountPrediction } from './prediction.js';
import { mountComparison } from './comparison.js';
import { mountSuggestions } from './suggestions.js';
import { mountReports } from './reports.js';
import { mountSales } from './sales.js';
import { mountExpenses } from './expenses.js';
import { mountProfitLoss } from './profitLoss.js';
import { mountInvoices } from './invoices.js';
import { mountPayments } from './payments.js';
import { mountBudgets } from './budgets.js';
import { mountCashflow } from './cashflow.js';
import { mountTax } from './tax.js';
import { mountInventory } from './inventory.js';
import { mountLowStock } from './lowStock.js';
import { mountCustomers } from './customers.js';
import { mountSuppliers } from './suppliers.js';
import { mountEmployees } from './employees.js';
import { mountPricing } from './pricing.js';
import { mountImportExport } from './importExport.js';
import { mountReminders } from './reminders.js';
import { mountGoals } from './goals.js';
import { mountDocuments } from './documents.js';
import { mountDataImportExport } from './dataImportExport.js';

// Searchable directory of all modules for the global topbar search
const MODULE_DIRECTORY = [
  { path: '#/dashboard', title: 'Executive Dashboard', keywords: ['kpi', 'summary', 'overview', 'home', 'revenue'] },
  { path: '#/assistant', title: 'AI Business Assistant', keywords: ['ai', 'chat', 'gemini', 'bot', 'help', 'ask'] },
  { path: '#/prediction', title: 'Sales & Profit Prediction', keywords: ['forecast', 'predict', 'regression', 'trend'] },
  { path: '#/comparison', title: 'Period Comparison', keywords: ['compare', 'delta', 'growth', 'quarter', 'month'] },
  { path: '#/suggestions', title: 'AI Growth Suggestions', keywords: ['tips', 'advice', 'optimize', 'cost cutting'] },
  { path: '#/reports', title: 'Automatic Business Reports', keywords: ['statement', 'pdf', 'excel', 'csv', 'audit'] },
  { path: '#/sales', title: 'Sales Management', keywords: ['revenue', 'orders', 'clients', 'transactions'] },
  { path: '#/expenses', title: 'Expense Management', keywords: ['bills', 'spending', 'costs', 'vouchers'] },
  { path: '#/profit-loss', title: 'Profit & Loss Statement', keywords: ['p&l', 'margins', 'cogs', 'net profit'] },
  { path: '#/invoices', title: 'Invoice Generator', keywords: ['bill', 'tax invoice', 'gst', 'pdf', 'client'] },
  { path: '#/payments', title: 'Payment Tracking', keywords: ['receivable', 'overdue', 'cheque', 'upi', 'neft'] },
  { path: '#/budgets', title: 'Budget Management', keywords: ['caps', 'spending limits', 'variance', 'warning'] },
  { path: '#/cashflow', title: 'Cash Flow Management', keywords: ['inflow', 'outflow', 'liquidity', 'balance'] },
  { path: '#/tax', title: 'Tax (GST) Compliance', keywords: ['gst', 'cgst', 'sgst', 'igst', 'itc', 'returns'] },
  { path: '#/inventory', title: 'Inventory Management', keywords: ['stock', 'sku', 'warehouse', 'items', 'materials'] },
  { path: '#/low-stock', title: 'Low Stock Alerts', keywords: ['reorder', 'critical', 'shortage', 'replenish'] },
  { path: '#/customers', title: 'Customer Management', keywords: ['clients', 'buyers', 'contacts', 'accounts'] },
  { path: '#/suppliers', title: 'Supplier Management', keywords: ['vendors', 'procurement', 'payables'] },
  { path: '#/employees', title: 'Workforce & Payroll', keywords: ['staff', 'attendance', 'salaries', 'salary slip'] },
  { path: '#/pricing', title: 'Product Pricing Calculator', keywords: ['markup', 'margins', 'break even', 'formula'] },
  { path: '#/import-export', title: 'Import & Export Costing', keywords: ['customs', 'duty', 'frankfurter', 'weather', 'port'] },
  { path: '#/reminders', title: 'Business Reminders', keywords: ['deadlines', 'alerts', 'holidays', 'nager'] },
  { path: '#/goals', title: 'Goal Tracker', keywords: ['milestones', 'targets', 'quarterly', 'progress'] },
  { path: '#/documents', title: 'Document Vault', keywords: ['storage', 'upload', 'receipts', 'contracts', 'files'] },
  { path: '#/data', title: 'Bulk Data Import & Export', keywords: ['csv', 'excel', 'xlsx', 'ingest', 'backup'] }
];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Register All 26 Routes
  router.register('#/login', mountLogin, { title: 'Sign In' });
  router.register('#/dashboard', mountDashboard, { title: 'Executive Dashboard' });
  router.register('#/assistant', mountAssistant, { title: 'AI Business Assistant' });
  router.register('#/prediction', mountPrediction, { title: 'Sales & Profit Forecast' });
  router.register('#/comparison', mountComparison, { title: 'Period-over-Period Comparison' });
  router.register('#/suggestions', mountSuggestions, { title: 'AI Strategic Suggestions' });
  router.register('#/reports', mountReports, { title: 'Executive Reports & Statements' });
  router.register('#/sales', mountSales, { title: 'Commercial Sales Management' });
  router.register('#/expenses', mountExpenses, { title: 'Operational Expense Management' });
  router.register('#/profit-loss', mountProfitLoss, { title: 'Profit & Loss Statement' });
  router.register('#/invoices', mountInvoices, { title: 'Invoice Generator' });
  router.register('#/payments', mountPayments, { title: 'Payment Tracking & Receivables' });
  router.register('#/budgets', mountBudgets, { title: 'Budget Management' });
  router.register('#/cashflow', mountCashflow, { title: 'Cash Flow Management' });
  router.register('#/tax', mountTax, { title: 'Tax (GST) Calculator' });
  router.register('#/inventory', mountInventory, { title: 'Inventory & Stock Management' });
  router.register('#/low-stock', mountLowStock, { title: 'Low Stock Alert Center' });
  router.register('#/customers', mountCustomers, { title: 'Customer Directory & Accounts' });
  router.register('#/suppliers', mountSuppliers, { title: 'Supplier & Vendor Accounts' });
  router.register('#/employees', mountEmployees, { title: 'Workforce & Payroll Management' });
  router.register('#/pricing', mountPricing, { title: 'Product Pricing & Margin Calculator' });
  router.register('#/import-export', mountImportExport, { title: 'Import & Export Landed Cost Calculator' });
  router.register('#/reminders', mountReminders, { title: 'Business Reminders & Compliance' });
  router.register('#/goals', mountGoals, { title: 'Business Goal Tracker' });
  router.register('#/documents', mountDocuments, { title: 'Document Vault & File Storage' });
  router.register('#/data', mountDataImportExport, { title: 'Bulk Data Import & Export Hub' });

  // 2. Mobile Sidebar & Navigation UI Events
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (mobileToggle && sidebar && overlay) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // 3. User Sign Out
  const logoutBtn = document.getElementById('btn-sidebar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      api.setSession(null, null);
      ui.toast('You have successfully signed out.', 'info');
      window.location.hash = '#/login';
    });
  }

  // 4. Global Search Keyboard Shortcut & Navigation
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    // Press '/' anywhere to focus search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) return;

        // Find best match
        const match = MODULE_DIRECTORY.find(m => 
          m.title.toLowerCase().includes(query) ||
          m.path.toLowerCase().includes(query) ||
          m.keywords.some(k => k.includes(query) || query.includes(k))
        );

        if (match) {
          window.location.hash = match.path;
          searchInput.value = '';
          searchInput.blur();
        } else {
          ui.toast(`No matching module found for "${query}"`, 'info');
        }
      }
    });
  }

  // 5. Update Quick Badges (Low stock & Reminders)
  updateGlobalAlertBadges();

  // 6. Launch Router
  router.init();
});

async function updateGlobalAlertBadges() {
  if (!api.isAuthenticated()) return;

  try {
    const [lowStockData, reminderData] = await Promise.allSettled([
      api.get('/api/low-stock'),
      api.get('/api/reminders')
    ]);

    // Low stock badge
    if (lowStockData.status === 'fulfilled' && lowStockData.value) {
      const items = lowStockData.value.lowStockItems || lowStockData.value.items || [];
      const count = items.length;
      const sidebarBadge = document.getElementById('sidebar-lowstock-badge');
      const topbarPill = document.getElementById('topbar-lowstock-pill');
      const topbarCount = document.getElementById('topbar-lowstock-count');

      if (count > 0) {
        if (sidebarBadge) {
          sidebarBadge.textContent = count;
          sidebarBadge.style.display = 'inline-block';
        }
        if (topbarPill && topbarCount) {
          topbarCount.textContent = `${count} item${count > 1 ? 's' : ''} low`;
          topbarPill.style.display = 'inline-flex';
        }
      } else {
        if (sidebarBadge) sidebarBadge.style.display = 'none';
        if (topbarPill) topbarPill.style.display = 'none';
      }
    }

    // Reminders badge
    if (reminderData.status === 'fulfilled' && reminderData.value) {
      const reminders = reminderData.value.reminders || reminderData.value || [];
      const pendingCount = Array.isArray(reminders) ? reminders.filter(r => !r.is_completed).length : 0;
      const topbarRemindersPill = document.getElementById('topbar-reminders-pill');
      const topbarRemindersCount = document.getElementById('topbar-reminders-count');

      if (pendingCount > 0 && topbarRemindersPill && topbarRemindersCount) {
        topbarRemindersCount.textContent = `${pendingCount} due`;
        topbarRemindersPill.style.display = 'inline-flex';
      } else if (topbarRemindersPill) {
        topbarRemindersPill.style.display = 'none';
      }
    }
  } catch (err) {
    console.debug('Badge update failed:', err);
  }
}
