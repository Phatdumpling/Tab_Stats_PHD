async function loadData() {
  const data = await browser.storage.local.get(["mostToday", "mostEver", "logs"]);
  document.getElementById("mostToday").textContent = data.mostToday || 0;
  document.getElementById("mostEver").textContent = data.mostEver || 0;

  const tabs = await browser.tabs.query({ currentWindow: true });
  document.getElementById("currentCount").textContent = tabs.length;

  const logs = (data.logs || []).slice().reverse(); // most recent first
  const table = document.getElementById("logTable");
  table.innerHTML = "";

  for (let log of logs) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.time}</td>
      <td>${log.action}</td>
      <td>${log.change}</td>
      <td>${log.after}</td>
    `;
    table.appendChild(row);
  }
}

// Listen for changes in storage (live updates)
browser.storage.onChanged.addListener(() => {
  loadData();
});

document.addEventListener("DOMContentLoaded", loadData);
