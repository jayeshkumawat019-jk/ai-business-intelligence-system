// js/prediction.js - Sales & Profit Prediction UI with OLS Forecasting & Solid/Dashed Trajectory Chart

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

export async function mountPrediction(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Predictive Sales &amp; Profit Forecasting</h1>
        <p>Ordinary Least Squares (OLS) mathematical regression projecting the next 6 months of commercial growth</p>
      </div>
    </div>

    <!-- Statistical Metrics Summary -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Forecasted Monthly Growth Slope</span>
          <div class="kpi-icon-pill" style="color:var(--status-info-text); background-color:var(--status-info-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-info-text);" id="pred-sales-slope">-</div>
        <div class="kpi-footer">Average monthly sales increment</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Annualized Revenue Growth</span>
          <div class="kpi-icon-pill" style="color:var(--status-success-text); background-color:var(--status-success-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-success-text);" id="pred-growth-rate">-%</div>
        <div class="kpi-footer">Compounded projected trajectory</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Regression Model Fit (R²)</span>
          <div class="kpi-icon-pill" style="color:var(--status-warning-text); background-color:var(--status-warning-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="pred-rsquared">-</div>
        <div class="kpi-footer" id="pred-confidence-footer">Confidence interval</div>
      </div>
    </div>

    <!-- Chart Card with Solid Historical Line and Dashed Forecast Line -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title">Historical Sales &amp; Future Forecast (6 Months Ahead)</h2>
          <span class="card-subtitle">Solid Line: Realized Database Ledgers &bull; Dashed Line: OLS Mathematical Forecast</span>
        </div>
      </div>
      <div class="card-body">
        <div id="prediction-line-chart" style="height: 320px; position: relative;">
          <!-- Chart -->
        </div>
      </div>
    </div>

    <!-- Forecasted Ledger Table Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Projected Revenue &amp; Net Profit Forecast Schedule</h2>
        <span class="card-subtitle">Values calculated via linear regression</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="prediction-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  await loadPrediction();
}

async function loadPrediction() {
  const tableWrap = document.getElementById('prediction-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/prediction');

    if (!res.hasEnoughData) {
      document.getElementById('router-view').innerHTML = `
        <div class="card" style="max-width:540px; margin: 3rem auto; text-align:center; padding: 2.5rem;">
          <div style="font-size:2.5rem; margin-bottom:1rem;">📊</div>
          <h2 style="font-size:1.2rem; font-weight:800; margin-bottom:0.5rem;">Insufficient Historical Data</h2>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1.5rem;">${ui.escapeHtml(res.message)}</p>
          <a href="#/sales" class="btn btn-primary">Record Sales Transactions</a>
        </div>
      `;
      return;
    }

    const { history, forecast, metrics } = res;

    document.getElementById('pred-sales-slope').textContent = `+${ui.formatINR(metrics.salesSlope)}`;
    document.getElementById('pred-growth-rate').textContent = `+${metrics.growthRatePct}% / yr`;
    document.getElementById('pred-rsquared').textContent = `R² = ${metrics.rSquaredSales.toFixed(2)}`;
    document.getElementById('pred-confidence-footer').textContent = metrics.confidenceNote;

    // Build Chart datasets with Solid History line and Dashed Forecast line
    const allLabels = [...history.map(h => h.month), ...forecast.map(f => f.month)];

    // Historical sales line (stops at end of history)
    const histSalesSeries = history.map(h => h.sales);
    for (let i = 0; i < forecast.length; i++) histSalesSeries.push(null);

    // Forecast line (starts from last historical point)
    const forecastSalesSeries = [];
    for (let i = 0; i < history.length - 1; i++) forecastSalesSeries.push(null);
    forecastSalesSeries.push(history[history.length - 1].sales); // bridge point
    forecast.forEach(f => forecastSalesSeries.push(f.forecastSales));

    // Forecast Profit line
    const forecastProfitSeries = [];
    for (let i = 0; i < history.length - 1; i++) forecastProfitSeries.push(null);
    forecastProfitSeries.push(history[history.length - 1].profit);
    forecast.forEach(f => forecastProfitSeries.push(f.forecastProfit));

    charts.line('prediction-line-chart', {
      labels: allLabels,
      datasets: [
        {
          label: 'Realized Historical Sales (₹)',
          data: histSalesSeries,
          color: '#2563EB',
          fill: true,
          pointRadius: 4
        },
        {
          label: 'Forecasted Sales (6-Mo Projection)',
          data: forecastSalesSeries,
          color: '#2563EB',
          borderDash: [6, 4],
          fill: false,
          pointRadius: 4
        },
        {
          label: 'Forecasted Net Profit',
          data: forecastProfitSeries,
          color: '#059669',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 4
        }
      ]
    });

    // Render Projection Table
    tableWrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Future Timeline Month</th>
            <th class="table-col-num">Forecasted Sales Turnover (₹)</th>
            <th class="table-col-num">Forecasted Net Profit (₹)</th>
            <th class="table-col-num">Projected Profit Margin</th>
            <th>Confidence Horizon</th>
          </tr>
        </thead>
        <tbody>
          ${forecast.map((f, idx) => {
            const margin = f.forecastSales > 0 ? ((f.forecastProfit / f.forecastSales) * 100).toFixed(1) : '0';
            return `
              <tr>
                <td><strong>${f.month}</strong> (Month +${idx + 1})</td>
                <td class="table-col-num" style="font-weight:700; color:var(--status-info-text);">${ui.formatINR(f.forecastSales)}</td>
                <td class="table-col-num" style="font-weight:700; color:var(--status-success-text);">${ui.formatINR(f.forecastProfit)}</td>
                <td class="table-col-num">${margin}%</td>
                <td>
                  <span class="chip ${idx < 3 ? 'chip-success' : 'chip-info'}">
                    ${idx < 3 ? 'High Confidence (Near Term)' : 'Medium Horizon (Trend)'}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    ui.toast(`Prediction error: ${err.message}`, 'error');
  }
}
