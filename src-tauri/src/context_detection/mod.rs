pub mod browser_bridge;
pub mod context_resolver;
pub mod os_detector;

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DetectedContext {
    pub source: ContextSource,
    pub app_id: String,
    pub app_name: String,
    pub context_style: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum ContextSource {
    OsDetection,
    BrowserExtension,
    LlmInference,
    Fallback,
}

impl Default for DetectedContext {
    fn default() -> Self {
        Self {
            source: ContextSource::Fallback,
            app_id: "unknown".to_string(),
            app_name: "Unknown".to_string(),
            context_style: "correction".to_string(),
            confidence: 0.5,
        }
    }
}
