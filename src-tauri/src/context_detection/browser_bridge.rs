use futures_util::StreamExt;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tokio_tungstenite::accept_async;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserContext {
    pub browser: String,
    pub url: String,
    pub domain: String,
    pub page_title: String,
    pub detected_app: Option<String>,
}

pub struct BrowserBridge {
    latest_context: Arc<RwLock<Option<BrowserContext>>>,
    port: u16,
}

impl BrowserBridge {
    pub fn new(port: u16) -> Self {
        Self {
            latest_context: Arc::new(RwLock::new(None)),
            port,
        }
    }

    pub async fn start(&self) -> Result<(), String> {
        let addr = format!("127.0.0.1:{}", self.port);
        let listener = TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Failed to bind WebSocket server: {}", e))?;

        info!("Browser bridge listening on ws://{}", addr);

        let context = self.latest_context.clone();

        tokio::spawn(async move {
            while let Ok((stream, peer)) = listener.accept().await {
                debug!("Browser extension connected from: {}", peer);
                let ctx = context.clone();

                tokio::spawn(async move {
                    match accept_async(stream).await {
                        Ok(ws_stream) => {
                            let (_, mut read) = ws_stream.split();

                            while let Some(msg_result) = read.next().await {
                                match msg_result {
                                    Ok(msg) => {
                                        if let Ok(text) = msg.to_text() {
                                            if let Ok(browser_ctx) =
                                                serde_json::from_str::<BrowserContext>(text)
                                            {
                                                debug!(
                                                    "Received browser context: {} - {}",
                                                    browser_ctx.domain, browser_ctx.page_title
                                                );
                                                *ctx.write().await = Some(browser_ctx);
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        debug!("WebSocket error: {}", e);
                                        break;
                                    }
                                }
                            }
                            debug!("Browser extension disconnected");
                        }
                        Err(e) => {
                            error!("WebSocket handshake failed: {}", e);
                        }
                    }
                });
            }
        });

        Ok(())
    }

    pub async fn get_current_context(&self) -> Option<BrowserContext> {
        self.latest_context.read().await.clone()
    }

    pub fn identify_from_domain(domain: &str) -> Option<String> {
        match domain {
            "mail.google.com" => Some("gmail".to_string()),
            "outlook.office.com" | "outlook.live.com" | "outlook.office365.com" => {
                Some("outlook_web".to_string())
            }
            "app.slack.com" | "slack.com" => Some("slack_web".to_string()),
            "discord.com" => Some("discord_web".to_string()),
            "web.whatsapp.com" => Some("whatsapp_web".to_string()),
            "web.telegram.org" => Some("telegram_web".to_string()),
            "chat.openai.com" | "chatgpt.com" => Some("chatgpt".to_string()),
            "claude.ai" => Some("claude".to_string()),
            "notion.so" | "www.notion.so" => Some("notion_web".to_string()),
            "www.linkedin.com" | "linkedin.com" => Some("linkedin".to_string()),
            "twitter.com" | "x.com" => Some("twitter".to_string()),
            "github.com" | "www.github.com" => Some("github".to_string()),
            "linear.app" => Some("linear_web".to_string()),
            "teams.microsoft.com" => Some("teams_web".to_string()),
            _ => None,
        }
    }
}

impl Default for BrowserBridge {
    fn default() -> Self {
        Self::new(9876)
    }
}
