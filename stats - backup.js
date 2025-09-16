// --- Get dailyRecords from storage ---
async function getDailyRecords() {
  const result = await browser.storage.local.get("dailyRecords");
  return result.dailyRecords || {};
}

// --- Filter helper ---
function filterData(records, period) {
  const entries = Object.entries(records)
    .map(([date, value]) => ({ date: new Date(date), value }))
    .sort((a, b) => a.date - b.date);

  let cutoff = null;
  if (period === "1M") {
    cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);
  } else if (period === "6M") {
    cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
  }
  return cutoff ? entries.filter(e => e.date >= cutoff) : entries;
}

// --- Chart.js setup ---
const ctx = document.getElementById("recordsChart").getContext("2d");
let chart = null;

function updateChart(records, period = "1M") {
  const data = filterData(records, period);

  const labels = data.map(d => d.date.toDateString());
  const values = data.map(d => d.value);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Daily Value",
        data: values,
        borderColor: "blue",
        fill: false,
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,           // Chart scales with container
      maintainAspectRatio: false, // Allows stretching to container size
      plugins: {
        tooltip: {
          callbacks: {
            title: (tooltipItems) => labels[tooltipItems[0].dataIndex],
            label: (tooltipItem) => `Value: ${tooltipItem.raw}`
          }
        }
      },
      interaction: {
            mode: 'nearest',   // 'nearest' finds the nearest point
            axis: 'x',         // 'x' allows tooltip if cursor is vertically aligned
            intersect: false   // false shows tooltip even if cursor is not exactly on the point
      },
      scales: {
        x: {
          title: { display: true, text: "Date" },
          ticks: { maxRotation: 45, minRotation: 45 }
        },
        y: {
          title: { display: true, text: "Value" },
          beginAtZero: true
        }
      }
    }
  });
}

// --- Filter buttons setup ---
function setupFilters(records) {
  document.querySelectorAll("#filters button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateChart(records, btn.dataset.period);
    });
  });
}

// --- Init ---
(async function init() {
  const records = await getDailyRecords();
  //const records = {};

  // if no data in storage, make some fake for testing
  if (Object.keys(records).length === 0) {
    console.warn("No records found, generating fake data for testing...");
    const today = new Date();
    const fake = {};
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      fake[d.toDateString()] = Math.floor(Math.random() * 100);
    }
    updateChart(fake, "1M");
    setupFilters(fake);
  } else {
    updateChart(records, "1M");
    setupFilters(records);
  }
})();
