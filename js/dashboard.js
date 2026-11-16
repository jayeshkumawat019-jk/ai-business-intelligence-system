// js/dashboard.js - Executive Business Dashboard UI with KPIs, Charts & Real-Time Feed

import { api } from './api.js';
import { ui } from './ui.js';
import { charts, CHART_COLORS } from './charts.js';

export async function mountDashboard(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Executive Dashboard</h1>
        <p>Real-time enterprise overview &bull; Profit margins, financial run rate &amp; inventory operations</p>
      </div>
      <div class="filter-actions-row">
        <a href="#/assistant" class="btn btn-secondary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Ask AI Assistant
        </a>
        <a href="#/invoices" class="btn btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Invoice
        </a>
      </div>
    </div>

    <!-- 5 KPI Cards Grid -->
    <div class="kpi-grid">
      <!-- Total Sales -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Gross Revenue</span>
          <div class="kpi-icon-pill" style="color:var(--status-info-text); background-color:var(--status-info-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="dash-kpi-sales">-</div>
        <div class="kpi-footer">Cumulative sales turnover</div>
      </div>

      <!-- Total Expenses -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Total Outlays</span>
          <div class="kpi-icon-pill" style="color:var(--status-danger-text); background-color:var(--status-danger-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="dash-kpi-expenses">-</div>
        <div class="kpi-footer">Operating + raw material costs</div>
      </div>

      <!-- Net Profit -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Net Profit</span>
          <div class="kpi-icon-pill" style="color:var(--status-success-text); background-color:var(--status-success-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-success-text);" id="dash-kpi-profit">-</div>
        <div class="kpi-footer" id="dash-kpi-margin">Revenue &minus; Expenditure</div>
      </div>

      <!-- Pending Payments -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Pending Receivables</span>
          <div class="kpi-icon-pill" style="color:var(--status-warning-text); background-color:var(--status-warning-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-warning-text);" id="dash-kpi-pending">-</div>
        <div class="kpi-footer" id="dash-kpi-pending-count">-</div>
      </div>

      <!-- Low Stock Alerts -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Low Stock SKUs</span>
          <div class="kpi-icon-pill" style="color:var(--status-danger-text); background-color:var(--status-danger-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="dash-kpi-lowstock">-</div>
        <div class="kpi-footer">Requiring purchase reorders</div>
      </div>
    </div>

    <!-- Charts Row 1: Line Chart Monthly Sales vs Expenses -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title">Monthly Revenue vs. Operational Expenditure</h2>
          <span class="card-subtitle">Last 12 months financial performance trajectory</span>
        </div>
      </div>
      <div class="card-body">
        <div id="dash-sales-expenses-chart" style="height: 300px; position: relative;">
          <!-- Line Chart Canvas -->
        </div>
      </div>
    </div>

    <!-- Charts Row 2: Expense Categories Doughnut & Top 5 Products Bar Chart -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- Expense Breakdown -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Cost Center Breakdown</h2>
            <span class="card-subtitle">Expenses categorized by department</span>
          </div>
        </div>
        <div class="card-body">
          <div id="dash-expense-doughnut-chart" style="height: 250px; position: relative;">
            <!-- Doughnut Chart Canvas -->
          </div>
        </div>
      </div>

      <!-- Top 5 Products Bar Chart -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Top 5 Products by Revenue</h2>
            <span class="card-subtitle">Best performing catalog merchandise</span>
          </div>
        </div>
        <div class="card-body">
          <div id="dash-top-products-chart" style="height: 250px; position: relative;">
            <!-- Bar Chart Canvas -->
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity Feed Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Recent Activity Feed</h2>
        <span class="card-subtitle">Real-time ledger updates from database</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div id="dash-activity-list">
          <!-- Injected Activity Items -->
        </div>
      </div>
    </div>
  `;

  await loadDashboard();
}

async function loadDashboard() {
  try {
    const data = await api.get('/api/dashboard');
    const { kpis, monthlyComparison, expenseCategories, topProducts, recentActivity } = data;

    // Populate KPIs
    document.getElementById('dash-kpi-sales').textContent = ui.formatINR(kpis.totalSales);
    document.getElementById('dash-kpi-expenses').textContent = ui.formatINR(kpis.totalExpenses);
    document.getElementById('dash-kpi-profit').textContent = ui.formatINR(kpis.netProfit);

    const marginPct = kpis.totalSales > 0 ? ((kpis.netProfit / kpis.totalSales) * 100).toFixed(1) : '0';
    document.getElementById('dash-kpi-margin').textContent = `Net Profit Margin: ${marginPct}%`;

    document.getElementById('dash-kpi-pending').textContent = ui.formatINR(kpis.pendingPaymentsSum);
    document.getElementById('dash-kpi-pending-count').textContent = `${kpis.pendingPaymentsCount} pending invoice(s)`;

    document.getElementById('dash-kpi-lowstock').textContent = `${kpis.lowStockCount} items`;

    // Render Line Chart: Monthly Sales vs Expenses
    charts.line('dash-sales-expenses-chart', {
      labels: monthlyComparison.months,
      datasets: [
        {
          label: 'Sales Revenue (₹)',
          data: monthlyComparison.sales,
          color: '#2563EB',
          fill: true
        },
        {
          label: 'Total Expenses (₹)',
          data: monthlyComparison.expenses,
          color: '#DC2626',
          fill: false
        }
      ]
    });

    // Render Doughnut Chart: Expense Categories
    charts.doughnut('dash-expense-doughnut-chart', {
      labels: expenseCategories.labels,
      data: expenseCategories.data,
      colors: CHART_COLORS.palette
    });

    // Render Bar Chart: Top 5 Products
    charts.bar('dash-top-products-chart', {
      labels: topProducts.map(p => p.sku || p.name.slice(0, 12)),
      datasets: [{
        label: 'Gross Sales (₹)',
        data: topProducts.map(p => p.revenue),
        backgroundColor: '#059669'
      }]
    });

    // Render Activity Feed
    const activityWrap = document.getElementById('dash-activity-list');
    if (activityWrap) {
      if (!recentActivity || recentActivity.length === 0) {
        activityWrap.innerHTML = '<div class="empty-state" style="padding:2rem;"><p class="empty-desc">No recent activity recorded.</p></div>';
      } else {
        activityWrap.innerHTML = `
          <table class="data-table">
            <tbody>
              ${recentActivity.map(act => `
                <tr>
                  <td style="width: 40px;">
                    <div style="width:28px; height:28px; border-radius:50%; background-color:${act.type === 'sale' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)'}; display:flex; align-items:center; justify-content:center; color:${act.type === 'sale' ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        ${act.type === 'sale' ? '<polyline points="20 6 9 17 4 12"/>' : '<line x1="12" y1="5" x2="12" y2="19"/>'}
                      </svg>
                    </div>
                  </td>
                  <td>
                    <strong>${ui.escapeHtml(act.title)}</strong>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${ui.formatDate(act.date)}</div>
                  </td>
                  <td><span class="chip ${act.type === 'sale' ? 'chip-success' : 'chip-warning'}">${ui.escapeHtml(act.badge)}</span></td>
                  <td class="table-col-num" style="font-weight:700; ${act.type === 'sale' ? 'color:var(--status-success-text);' : 'color:var(--status-danger-text);'}">
                    ${act.type === 'sale' ? '+' : '-'}${ui.formatINR(act.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }
  } catch (err) {
    ui.toast(`Dashboard error: ${err.message}`, 'error');
  }
}
