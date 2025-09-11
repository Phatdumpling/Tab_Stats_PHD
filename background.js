async function updateCounts(action = "initial", change = 0) {
  const tabs = await browser.tabs.query({ currentWindow: true });
  const count = tabs.length;
  if (action == "initial opening") {
    change = count;
  }
    

  let { mostToday = 0, mostEver = 0, logs = [] } = await browser.storage.local.get();

  // Update daily max
  if (count > mostToday) mostToday = count;
  // Update all-time max
  if (count > mostEver) mostEver = count;

  // Create log entry
  const now = new Date();
  const log = {
    time: now.toLocaleString(),
    action,
    change,
    after: count
  };
  logs.push(log);

  await browser.storage.local.set({ mostToday, mostEver, logs });
}

// Initial load
updateCounts("initial opening", 0);

// Listen for tab changes
browser.tabs.onCreated.addListener(() => updateCounts("opened a tab", +1));
browser.tabs.onRemoved.addListener(() => updateCounts("closed a tab", -1));
