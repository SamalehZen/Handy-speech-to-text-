use super::browser_bridge::BrowserBridge;
use super::os_detector;
use super::{ContextSource, DetectedContext};
use crate::settings::AppSettings;
use log::debug;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct ContextResolver {
    browser_bridge: Option<Arc<RwLock<BrowserBridge>>>,
}

impl ContextResolver {
    pub fn new(browser_bridge: Option<Arc<RwLock<BrowserBridge>>>) -> Self {
        Self { browser_bridge }
    }

    pub async fn resolve(&self, settings: &AppSettings) -> DetectedContext {
        if let Some((process, title)) = os_detector::get_active_window_info() {
            debug!(
                "OS detected window - process: '{}', title: '{}'",
                process, title
            );

            if let Some(app_id) = os_detector::identify_app(&process, &title) {
                if let Some(style) = self.get_context_style(&app_id, settings) {
                    debug!("Identified app '{}' with style '{}'", app_id, style);
                    return DetectedContext {
                        source: ContextSource::OsDetection,
                        app_id: app_id.clone(),
                        app_name: os_detector::get_app_display_name(&app_id),
                        context_style: style,
                        confidence: 1.0,
                    };
                }
            }

            if os_detector::is_browser(&process.to_lowercase()) {
                debug!("Browser detected, checking browser bridge...");

                if let Some(ref bridge) = self.browser_bridge {
                    if let Some(browser_ctx) = bridge.read().await.get_current_context().await {
                        debug!(
                            "Browser context from extension: domain='{}', title='{}'",
                            browser_ctx.domain, browser_ctx.page_title
                        );

                        if let Some(app_id) = browser_ctx
                            .detected_app
                            .clone()
                            .or_else(|| BrowserBridge::identify_from_domain(&browser_ctx.domain))
                        {
                            if let Some(style) = self.get_context_style(&app_id, settings) {
                                debug!(
                                    "Browser extension identified app '{}' with style '{}'",
                                    app_id, style
                                );
                                return DetectedContext {
                                    source: ContextSource::BrowserExtension,
                                    app_id: app_id.clone(),
                                    app_name: os_detector::get_app_display_name(&app_id),
                                    context_style: style,
                                    confidence: 0.98,
                                };
                            }
                        }
                    }
                }

                if let Some(app_id) = os_detector::identify_app(&process, &title) {
                    if let Some(style) = self.get_context_style(&app_id, settings) {
                        debug!(
                            "Browser title fallback identified app '{}' with style '{}'",
                            app_id, style
                        );
                        return DetectedContext {
                            source: ContextSource::OsDetection,
                            app_id: app_id.clone(),
                            app_name: os_detector::get_app_display_name(&app_id),
                            context_style: style,
                            confidence: 0.7,
                        };
                    }
                }
            }
        }

        debug!("No context detected, using fallback");
        DetectedContext::default()
    }

    fn get_context_style(&self, app_id: &str, settings: &AppSettings) -> Option<String> {
        if let Some(mapping) = settings
            .context_mappings
            .iter()
            .find(|m| m.app_id == app_id)
        {
            return Some(mapping.context_style.clone());
        }

        os_detector::get_default_context_style(app_id).map(|s| s.to_string())
    }
}

impl Default for ContextResolver {
    fn default() -> Self {
        Self::new(None)
    }
}
