// js/charts.js - Chart.js Wrapper with Palette, Currency Formatting & Lifecycle Management

const chartInstances = new Map();

export const CHART_COLORS = {
  blue: '#2563EB',
  green: '#059669',
  amber: '#D97706',
  red: '#DC2626',
  purple: '#7C3AED',
  cyan: '#0891B2',
  pink: '#DB2777',
  gray: '#78716C',
  palette: [
    '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#4B5563', '#EA580C', '#10B981'
  ],
  paletteBg: [
    'rgba(37, 99, 235, 0.15)', 'rgba(5, 150, 105, 0.15)', 'rgba(217, 119, 6, 0.15)',
    'rgba(220, 38, 38, 0.15)', 'rgba(124, 58, 237, 0.15)', 'rgba(8, 145, 178, 0.15)'
  ]
};

function getOrCreateCanvas(containerId) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) return null;

  // Clean up existing instance
  if (chartInstances.has(container.id)) {
    try {
      chartInstances.get(container.id).destroy();
    } catch (e) {}
    chartInstances.delete(container.id);
  }

  // Ensure canvas element
  let canvas;
  if (container.tagName.toLowerCase() === 'canvas') {
    canvas = container;
  } else {
    container.innerHTML = '<canvas style="max-height: 100%; width: 100%;"></canvas>';
    canvas = container.querySelector('canvas');
  }

  return { container, canvas };
}

export const charts = {
  destroy(containerId) {
    if (chartInstances.has(containerId)) {
      try {
        chartInstances.get(containerId).destroy();
      } catch (e) {}
      chartInstances.delete(containerId);
    }
  },

  destroyAll() {
    chartInstances.forEach(instance => {
      try { instance.destroy(); } catch (e) {}
    });
    chartInstances.clear();
  },

  // 1. LINE CHART (e.g., Monthly Sales vs Expenses, Cash Flow Trend, Predictions)
  line(containerId, { labels, datasets, title = '', isCurrency = true, stepped = false }) {
    const target = getOrCreateCanvas(containerId);
    if (!target) return null;

    if (!labels || labels.length === 0) {
      target.container.innerHTML = '<div class="empty-state" style="padding:2rem;"><p class="empty-desc">No data available for this chart</p></div>';
      return null;
    }

    const ctx = target.canvas.getContext('2d');
    const chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, idx) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color || CHART_COLORS.palette[idx % CHART_COLORS.palette.length],
          backgroundColor: ds.backgroundColor || (ds.fill ? CHART_COLORS.paletteBg[idx % CHART_COLORS.paletteBg.length] : 'transparent'),
          fill: Boolean(ds.fill),
          tension: ds.tension !== undefined ? ds.tension : 0.3,
          borderDash: ds.borderDash || [],
          pointRadius: ds.pointRadius !== undefined ? ds.pointRadius : 3,
          pointHoverRadius: 6,
          borderWidth: ds.borderWidth || 2.5
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: { font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 }, boxWidth: 14 }
          },
          tooltip: {
            callbacks: {
              label(context) {
                const val = context.parsed.y;
                return ` ${context.dataset.label}: ${isCurrency ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val) : val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(231, 229, 224, 0.6)' },
            ticks: {
              font: { family: 'JetBrains Mono', size: 11 },
              callback(value) {
                if (!isCurrency) return value;
                if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                return `₹${value}`;
              }
            }
          }
        }
      }
    });

    chartInstances.set(target.container.id || containerId, chart);
    return chart;
  },

  // 2. BAR CHART (e.g., Top Products, Comparison, Budgets)
  bar(containerId, { labels, datasets, horizontal = false, stacked = false, isCurrency = true }) {
    const target = getOrCreateCanvas(containerId);
    if (!target) return null;

    if (!labels || labels.length === 0) {
      target.container.innerHTML = '<div class="empty-state" style="padding:2rem;"><p class="empty-desc">No data available for this chart</p></div>';
      return null;
    }

    const ctx = target.canvas.getContext('2d');
    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((ds, idx) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.backgroundColor || CHART_COLORS.palette[idx % CHART_COLORS.palette.length],
          borderColor: ds.borderColor || 'transparent',
          borderRadius: 4,
          maxBarThickness: 45
        }))
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'top',
            labels: { font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 }, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label(context) {
                const val = horizontal ? context.parsed.x : context.parsed.y;
                return ` ${context.dataset.label}: ${isCurrency ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val) : val}`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked,
            grid: { display: horizontal },
            ticks: {
              font: { family: horizontal ? 'JetBrains Mono' : 'Plus Jakarta Sans', size: 11 },
              callback(value) {
                if (!horizontal || !isCurrency) return value;
                if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                return `₹${value}`;
              }
            }
          },
          y: {
            stacked,
            grid: { color: horizontal ? 'transparent' : 'rgba(231, 229, 224, 0.6)' },
            ticks: {
              font: { family: horizontal ? 'Plus Jakarta Sans' : 'JetBrains Mono', size: 11 },
              callback(value) {
                if (horizontal || !isCurrency) return value;
                if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                return `₹${value}`;
              }
            }
          }
        }
      }
    });

    chartInstances.set(target.container.id || containerId, chart);
    return chart;
  },

  // 3. DOUGHNUT / PIE CHART (e.g., Expense Categories, Payment Statuses)
  doughnut(containerId, { labels, data, colors = [], isCurrency = true, cutout = '65%' }) {
    const target = getOrCreateCanvas(containerId);
    if (!target) return null;

    if (!labels || labels.length === 0 || !data || data.length === 0) {
      target.container.innerHTML = '<div class="empty-state" style="padding:2rem;"><p class="empty-desc">No data available</p></div>';
      return null;
    }

    const ctx = target.canvas.getContext('2d');
    const chart = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.length > 0 ? colors : CHART_COLORS.palette.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 }, boxWidth: 12, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label(context) {
                const val = context.raw;
                return ` ${context.label}: ${isCurrency ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val) : val}`;
              }
            }
          }
        }
      }
    });

    chartInstances.set(target.container.id || containerId, chart);
    return chart;
  }
};

export default charts;
