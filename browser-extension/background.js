const WS_PORT = 9876;
let ws = null;
let reconnectInterval = null;

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  
  ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);
  
  ws.onopen = () => {
    console.log('[Handy] Connected to Handy app');
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
    sendCurrentContext();
  };
  
  ws.onclose = () => {
    console.log('[Handy] Disconnected from Handy app');
    ws = null;
    if (!reconnectInterval) {
      reconnectInterval = setInterval(connect, 5000);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[Handy] WebSocket error:', error);
  };
}

function sendContext(context) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(context));
  }
}

async function sendCurrentContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      sendContext({
        browser: 'chrome',
        url: tab.url,
        domain: url.hostname,
        page_title: tab.title || '',
        detected_app: detectApp(url.hostname)
      });
    }
  } catch (e) {
    console.error('[Handy] Error getting current tab:', e);
  }
}

function detectApp(domain) {
  const mappings = {
    'mail.google.com': 'gmail',
    'outlook.office.com': 'outlook_web',
    'outlook.live.com': 'outlook_web',
    'outlook.office365.com': 'outlook_web',
    'app.slack.com': 'slack_web',
    'discord.com': 'discord_web',
    'web.whatsapp.com': 'whatsapp_web',
    'web.telegram.org': 'telegram_web',
    'chat.openai.com': 'chatgpt',
    'chatgpt.com': 'chatgpt',
    'claude.ai': 'claude',
    'notion.so': 'notion_web',
    'www.notion.so': 'notion_web',
    'www.linkedin.com': 'linkedin',
    'linkedin.com': 'linkedin',
    'twitter.com': 'twitter',
    'x.com': 'twitter',
    'github.com': 'github',
    'www.github.com': 'github',
    'linear.app': 'linear_web',
    'teams.microsoft.com': 'teams_web'
  };
  return mappings[domain] || null;
}

chrome.tabs.onActivated.addListener(sendCurrentContext);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    sendCurrentContext();
  }
});

connect();
