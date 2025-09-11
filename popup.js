async function updatePopup() {
  // Count current window tabs (all, including pinned)
  const tabs = await browser.tabs.query({ currentWindow: true });
  const currentCount = tabs.length;
  document.getElementById("current").textContent = currentCount;

  const today = new Date().toDateString();

  // Load max values from storage
  let { maxTabs } = await browser.storage.local.get("maxTabs");

  if (!maxTabs) {
    maxTabs = { today: { date: today, count: 0 }, ever: 0 };
  }

  // Reset today count if date changed
  if (maxTabs.today.date !== today) {
    maxTabs.today = { date: today, count: 0 };
  }

  // Update today max
  if (currentCount > maxTabs.today.count) {
    maxTabs.today.count = currentCount;
  }

  // Update ever max
  if (currentCount > maxTabs.ever) {
    maxTabs.ever = currentCount;
  }

  // Save updated values
  await browser.storage.local.set({ maxTabs });

  // Display
  document.getElementById("maxToday").textContent = maxTabs.today.count;
  document.getElementById("maxEver").textContent = maxTabs.ever;
}

// Run on popup load
updatePopup();

// popup.js - tolerant version
const api = (typeof browser !== "undefined") ? browser : (typeof chrome !== "undefined" ? chrome : null);

function log(...args) {
  try { console.log("[TabCounter popup]", ...args); } catch {}
}

async function loadStats() {
  try {
    const data = await (api && api.storage ? api.storage.local.get(["mostToday", "mostEver"]) : Promise.resolve({}));
    document.getElementById("mostToday").textContent = data.mostToday || 0;
    document.getElementById("mostEver").textContent = data.mostEver || 0;
  } catch (err) {
    log("Error loading stats:", err);
  }

  try {
    // show current count live
    const tabsAPI = api && api.tabs;
    if (tabsAPI && tabsAPI.query) {
      const tabs = await new Promise((resolve, reject) => {
        // support chrome callback style and browser promise style
        try {
          const maybePromise = tabsAPI.query({ currentWindow: true }, (tabs) => {
            // chrome callback path
            if (api.runtime && api.runtime.lastError) {
              reject(api.runtime.lastError);
            } else {
              resolve(tabs);
            }
          });
          // if it returned a promise, use it
          if (maybePromise && typeof maybePromise.then === "function") {
            maybePromise.then(resolve).catch(reject);
          }
        } catch (e) {
          reject(e);
        }
      });
      document.getElementById("currentCount").textContent = tabs.length;
    } else {
      // fallback: unknown environment
      document.getElementById("currentCount").textContent = "N/A";
    }
  } catch (err) {
    log("Error getting current tabs:", err);
    document.getElementById("currentCount").textContent = "Err";
  }
}

async function openDebugPage() {
  try {
    const url = (api && api.runtime) ? api.runtime.getURL("debug.html") : ("debug.html");
    log("Opening debug page:", url);

    if (api && api.tabs && api.tabs.create) {
      // Wrap callback-style chrome.tabs.create in a Promise
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
          // tabs.create may throw in some environments; fallback
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

    // optional: close the popup after opening debug page
    // window.close();
  } catch (err) {
    log("Failed to open debug page:", err);
    // visible feedback for quick testing
    alert("Could not open debug page:\n" + (err && err.message ? err.message : String(err)));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // wire button and load counts
  const btn = document.getElementById("debugBtn");
  if (btn) btn.addEventListener("click", openDebugPage);
  else log("debugBtn element not found in popup.html");

  loadStats();

  // optional: refresh the popup view every 2s while it's open
  // (popups only live while open so this won't burn CPU)
  const interval = setInterval(loadStats, 2000);
  window.addEventListener("unload", () => clearInterval(interval));
});

