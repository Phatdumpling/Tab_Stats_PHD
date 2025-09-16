

// popup.js - tolerant version
const api = (typeof browser !== "undefined") ? browser : (typeof chrome !== "undefined" ? chrome : null);

function log(...args) {
  try { console.log("[TabCounter popup]", ...args); } catch {}
}

async function loadStats() {
  try {
    const data = await (api && api.storage
      ? api.storage.local.get(["mostToday", "mostEver", "lastDate"])
      : Promise.resolve({})
    );
    const tabs = await browser.tabs.query({});
    const count = tabs.length;
    document.getElementById("current").textContent = count || 0;

    document.getElementById("mostToday").textContent = data.mostToday || 0;
    document.getElementById("mostEver").textContent = data.mostEver || 0;

    // optional: show the last reset date in your popup
    if (data.lastDate) {
      const dateEl = document.getElementById("lastDate");
      if (dateEl) {
        dateEl.textContent = `Since: ${data.lastDate}`;
      }
    }
  } catch (err) {
    log("Error loading stats:", err);
  }

  try {
    // show current tab count live
    const tabsAPI = api && api.tabs;
    if (tabsAPI && tabsAPI.query) {
      const tabs = await new Promise((resolve, reject) => {
        try {
          const maybePromise = tabsAPI.query({}, (tabs) => {
            if (api.runtime && api.runtime.lastError) {
              reject(api.runtime.lastError);
            } else {
              resolve(tabs);
            }
          });

          if (maybePromise && typeof maybePromise.then === "function") {
            maybePromise.then(resolve).catch(reject);
          }
        } catch (e) {
          reject(e);
        }
      });
      document.getElementById("current").textContent = tabs.length;
    } else {
      document.getElementById("current").textContent = "N/A";
    }
  } catch (err) {
    log("Error getting current tabs:", err);
    document.getElementById("current").textContent = "Err";
  }
}

loadStats()

async function openPage(page) {
  try {
    const url = (api && api.runtime) ? api.runtime.getURL(`${page}.html`) : `${page}.html`;
    log(`Opening ${page} page:`, url);

    if (api && api.tabs && api.tabs.create) {
      await new Promise((resolve, reject) => {
        try {
          api.tabs.create({ url }, (tab) => {
            if (api.runtime && api.runtime.lastError) {
              log("tabs.create lastError:", api.runtime.lastError);
              return reject(api.runtime.lastError);
            }
            resolve(tab);
          });
        } catch (e) {
          log("tabs.create threw, falling back to window.open()", e);
          const w = window.open(url, "_blank");
          if (w) resolve(w);
          else reject(e);
        }
      });
    } else {
      // final fallback
      const w = window.open(url, "_blank");
      if (!w) throw new Error("window.open returned null (popup blocked?)");
    }

    // optional: close the popup after opening
    // window.close();
  } catch (err) {
    log(`Failed to open ${page} page:`, err);
    alert(`Could not open ${page} page:\n` + (err?.message ?? String(err)));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const buttons = [
    { id: "debugBtn", page: "debug" },
    { id: "statsBtn", page: "stats" },
  ];

  for (const { id, page } of buttons) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => openPage(page));
    else log(`${id} element not found in popup.html`);
  }

  loadStats();

  const interval = setInterval(loadStats, 2000);
  window.addEventListener("unload", () => clearInterval(interval));
});

