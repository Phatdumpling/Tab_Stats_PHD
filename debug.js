async function loadLogs() {
    // Get stored stats
    const data = await browser.storage.local.get(["mostToday", "mostEver"]);
    document.getElementById("mostToday").textContent = data.mostToday || 0;
    document.getElementById("mostEver").textContent = data.mostEver || 0;

    // Get current tabs
    const tabs = await browser.tabs.query({});
    document.getElementById("currentCount").textContent = tabs.length;

    // Get logs
    const { logs = [] } = await browser.storage.local.get("logs");
    const tbody = document.querySelector("#logTable tbody");
    tbody.innerHTML = ""; // clear previous rows

    // Show most recent first
    [...logs].reverse().forEach(log => {
        const tr = document.createElement("tr");

        // Helper to create td safely
        const createTd = (text) => {
            const td = document.createElement("td");
            td.textContent = text ?? "";
            return td;
        };

        tr.appendChild(createTd(log.time));
        tr.appendChild(createTd(log.action));
        tr.appendChild(createTd(log.change));
        tr.appendChild(createTd(log.after));
        tr.appendChild(createTd(log.title));

        // URL cell with safe link
        const tdUrl = document.createElement("td");
        if (log.url) {
            const a = document.createElement("a");
            a.href = log.url;
            a.target = "_blank";
            a.textContent = log.url;
            tdUrl.appendChild(a);
        }
        tr.appendChild(tdUrl);

        tbody.appendChild(tr);
    });
}

// Initial load
loadLogs();

// Update logs if storage changes
browser.storage.onChanged.addListener(loadLogs);
document.addEventListener("DOMContentLoaded", loadLogs);