async function loadLogs() {
    const data = await browser.storage.local.get(["mostToday", "mostEver"]);
    document.getElementById("mostToday").textContent = data.mostToday || 0;
    document.getElementById("mostEver").textContent = data.mostEver || 0;

    const tabs = await browser.tabs.query({});
    document.getElementById("currentCount").textContent = tabs.length;


    const { logs = [] } = await browser.storage.local.get("logs");
    const tbody = document.querySelector("#logTable tbody");
    tbody.innerHTML = "";

    // show most recent first
    [...logs].reverse().forEach(log => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
        <td>${log.time || ""}</td>
        <td>${log.action || ""}</td>
        <td>${log.change || ""}</td>
        <td>${log.after || ""}</td>
        <td>${log.title ? log.title.replace(/</g, "&lt;") : ""}</td>
        <td>${log.url ? `<a href="${log.url}" target="_blank">${log.url}</a>` : ""}</td>
        `;

        tbody.appendChild(tr);
    });
}

loadLogs();
browser.storage.onChanged.addListener(loadLogs);
document.addEventListener("DOMContentLoaded", loadLogs);