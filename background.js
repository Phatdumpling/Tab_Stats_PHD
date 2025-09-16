async function updateCounts(action = "initial opening", change = 0, tabInfo = null) {
  const tabs = await browser.tabs.query({});
  const count = tabs.length;
  if (action === "initial opening") {
    change = count;
  }

  let after = count;
  if (change < 0) {
    after += change;
  }

  let { mostToday = 0, mostEver = 0, logs = [], lastDate = "", dailyRecords = {}} = await browser.storage.local.get();

  const today = new Date().toDateString();

  // Reset daily record if new day
  if (lastDate !== today) {
    mostToday = 0;
    lastDate = today;
  }

  if (count > mostToday) {
    mostToday = count;
  }
  if (count > mostEver) mostEver = count;

  // Update historical per-day records
  if (!dailyRecords[today] || count > dailyRecords[today]) {
    dailyRecords[today] = count;
  }

  const now = new Date();
  const log = {
    time: now.toLocaleString(),
    ts: now.getTime(),
    action,
    change,
    after,
    title: tabInfo?.title || null,
    url: tabInfo?.url || null
  };
  logs.push(log);

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  logs = logs.filter(entry => entry.ts >= cutoff);

  await browser.storage.local.set({ mostToday, mostEver, logs, lastDate , dailyRecords});
}

// Initial load
updateCounts("initial opening", 0);

// Track pending new tabs
const pendingTabs = new Map();

// Log immediately when a tab is created
browser.tabs.onCreated.addListener((tab) => {
  const tabInfo = { title: null, url: null };
  updateCounts("opened a tab", +1, tabInfo);

  // Track for later update once loaded
  pendingTabs.set(tab.id, true);
});

// Log when tab is fully loaded, but don't double-count
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && pendingTabs.has(tabId)) {
    const tabInfo = {
      title: tab.title,
      url: tab.url
    };

    // Log metadata update, but *no change in count*
    updateCounts("tab finished loading", 0, tabInfo);

    pendingTabs.delete(tabId);
  }
});

// Log closed tabs
browser.tabs.onRemoved.addListener((tabId) => {
  updateCounts("closed a tab", -1, { title: `Tab ${tabId}`, url: null });
  pendingTabs.delete(tabId);
});

/*
const pendingTabs = new Map();

// Log newly created tabs only
browser.tabs.onCreated.addListener((tab) => {
  // Only store the tab ID and opener
  pendingTabs.set(tab.id, { opener: tab.openerTabId || null });
});

// Wait until fully loaded
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && pendingTabs.has(tabId)) {
    const tabInfo = {
      title: tab.title,
      url: tab.url,
      opener: pendingTabs.get(tabId).opener
    };

    // Count this as a new tab opened
    updateCounts("opened a tab", +1, tabInfo);

    // Remove from pending
    pendingTabs.delete(tabId);
  }
});

// Tab removed listener stays the same
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const tabInfo = pendingTabs.get(tabId) || { title: `Tab ${tabId}`, url: null };
  updateCounts("closed a tab", -1, tabInfo);
  pendingTabs.delete(tabId);
});



// Listen for tab changes with tab details


browser.tabs.onCreated.addListener((tab) => {
  updateCounts("opened a tab", +1, { title: tab.title, url: tab.url });
});



browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // removed tabs don’t give title/url → best effort: fetch last known
  updateCounts("closed a tab", -1, { title: `Tab ${tabId}`, url: null });
});
*/