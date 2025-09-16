// --- Get dailyRecords from storage ---
async function getDailyRecords() {
  const result = await browser.storage.local.get("dailyRecords");
  return result.dailyRecords || {};
}

// --- Filter helper ---
function filterData(logs, dailyRecords, period) {
  let entries = [];

  const now = new Date();
  let cutoff = null;

  if (period === "1D") {
    cutoff = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
    entries = logs
      .map(r => ({ date: new Date(r.time), value: r.after }))
      .filter(e => e.date >= cutoff);
  } else if (period === "5D") {
    cutoff = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    entries = logs
      .map(r => ({ date: new Date(r.time), value: r.after }))
      .filter(e => e.date >= cutoff);
  } else {
    // For longer periods, use dailyRecords
    entries = Object.entries(dailyRecords)
      .map(([date, value]) => ({ date: new Date(date), value }));

    if (period === "1M") {
      cutoff = new Date();
      cutoff.setMonth(now.getMonth() - 1);
    } else if (period === "6M") {
      cutoff = new Date();
      cutoff.setMonth(now.getMonth() - 6);
    }

    if (cutoff) {
      entries = entries.filter(e => e.date >= cutoff);
    }
  }

  // Sort ascending
  return entries.sort((a, b) => a.date - b.date);
}



// --- Chart.js setup ---
const ctx = document.getElementById("recordsChart").getContext("2d");
let chart = null;

function updateChart(logs, dailyRecords, period = "1M") {
  const data = filterData(logs, dailyRecords, period);

  const labels = data.map(d => d.date);
  const values = data.map(d => d.value);

  if (chart) chart.destroy();

  let xUnit = "day";
  let maxTicks = 10;
  switch(period) {
    case "1D": xUnit="hour"; maxTicks=8; break;
    case "5D": xUnit="day"; maxTicks=10; break;
    case "1M": xUnit="day"; maxTicks=15; break;
    case "6M": xUnit="day"; maxTicks=20; break;
    case "Max": xUnit="month"; maxTicks=12; break;
  }

  // Determine line color: green if first > last, else red
  const lineColor = (values[0] < values[values.length - 1]) ? 'green' : 'red';

  // Create gradient for fill
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0, lineColor);
  gradient.addColorStop(1, 'white');

  const tooltipOptions = {
    callbacks: {
      title: (tooltipItems) => labels[tooltipItems[0].dataIndex].toLocaleString(),
      label: (tooltipItem) => `Tabs: ${tooltipItem.raw}`
    },
    // Force solid circles on tooltip
    pointStyle: 'circle'
  };

  const interactionOptions = {
    mode: 'nearest',
    axis: 'x',
    intersect: period === "1D" || period === "5D"
  };

  const chartData = (period === "1D" || period === "5D")
    ? data.map((d, i) => ({ x: i, y: d.value }))
    : values;

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: (period === "1D" || period === "5D") ? data.map((_, i) => i) : labels,
      datasets: [{
        label: "Tabs Count",
        data: chartData,
        borderColor: lineColor,    // Line color
        backgroundColor: gradient, // Fill under line
        fill: true,
        tension: 0,                // Hard, straight line
        pointRadius: 2,            // Smaller points
        pointHoverRadius: 5,
        pointStyle: 'circle'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: interactionOptions,
      plugins: {
        tooltip: tooltipOptions
      },
      scales: {
        x: {
          type: (period === "1D" || period === "5D") ? 'linear' : 'time',
          time: (period === "1D" || period === "5D") ? undefined : {
            unit: xUnit,
            tooltipFormat: 'MMM d, yyyy HH:mm',
            displayFormats: {
              hour: 'HH:mm',
              day: 'MMM d',
              month: 'MMM yyyy'
            }
          },
          ticks: { maxTicksLimit: maxTicks },
          title: { display: true, text: "Time" }
        },
        y: {
          title: { display: true, text: "Tabs" },
          beginAtZero: true
        }
      }
    }
  });
}



// --- Filter buttons setup ---
function setupFilters(logs, dailyRecords) {
  document.querySelectorAll("#filters button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateChart(logs, dailyRecords, btn.dataset.period);
    });
  });
}



// --- Init ---
(async function init() {
  const { logs = [], dailyRecords = {} } = await browser.storage.local.get(["logs", "dailyRecords"]);

  updateChart(logs, dailyRecords, "1M");
  setupFilters(logs, dailyRecords);
})();

