const WS_PORT = 9876;

async function checkConnection() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);
    ws.onopen = () => {
      ws.close();
      resolve(true);
    };
    ws.onerror = () => resolve(false);
    setTimeout(() => resolve(false), 1000);
  });
}

async function getCurrentContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return null;
  try {
    const url = new URL(tab.url);
    return { domain: url.hostname, title: tab.title };
  } catch {
    return null;
  }
}

async function updateUI() {
  const statusEl = document.getElementById("status");
  const contextEl = document.getElementById("context-value");

  const connected = await checkConnection();
  statusEl.className = `status ${connected ? "connected" : "disconnected"}`;
  statusEl.querySelector(".status-text").textContent = connected
    ? "Connected to Handy"
    : "Handy not detected";

  const context = await getCurrentContext();
  contextEl.textContent = context ? context.domain || "Local page" : "-";
}

updateUI();
setInterval(updateUI, 2000);
