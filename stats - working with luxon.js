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

  // Use Date objects for Chart.js time axis
  const labels = data.map(d => d.date);
  const values = data.map(d => d.value);

  // Destroy existing chart if any
  if (chart) chart.destroy();

  // Determine x-axis unit and max ticks dynamically
  let xUnit = "day";
  let maxTicks = 10;

  switch (period) {
    case "1D":
      xUnit = "hour";
      maxTicks = 8;
      break;
    case "5D":
      xUnit = "day";
      maxTicks = 10;
      break;
    case "1M":
      xUnit = "day";
      maxTicks = 15;
      break;
    case "6M":
      xUnit = "day";
      maxTicks = 20;
      break;
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Tabs Count",
        data: values,
        borderColor: "blue",
        fill: false,
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            title: (tooltipItems) => labels[tooltipItems[0].dataIndex].toLocaleString(),
            label: (tooltipItem) => `Tabs: ${tooltipItem.raw}`
          }
        }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: xUnit,
            tooltipFormat: 'MMM d, yyyy HH:mm',
            displayFormats: {
              hour: 'HH:mm',
              day: 'MMM d'
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

