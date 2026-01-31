pub mod audio_encoder;
pub mod gemini;
pub mod openai;

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Type, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum CloudSTTProviderId {
    OpenAI,
    Gemini,
}

impl std::fmt::Display for CloudSTTProviderId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CloudSTTProviderId::OpenAI => write!(f, "openai"),
            CloudSTTProviderId::Gemini => write!(f, "gemini"),
        }
    }
}

impl CloudSTTProviderId {
    pub fn parse(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "openai" => Some(CloudSTTProviderId::OpenAI),
            "gemini" => Some(CloudSTTProviderId::Gemini),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CloudSTTProvider {
    pub id: CloudSTTProviderId,
    pub label: String,
    pub description: String,
    pub base_url: String,
    pub models: Vec<CloudSTTModel>,
    pub default_model: String,
    pub api_key_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CloudSTTModel {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
pub struct CloudSTTConfig {
    pub enabled: bool,
    pub active_provider: Option<String>,
    pub api_keys: HashMap<String, String>,
    pub selected_models: HashMap<String, String>,
}

impl CloudSTTConfig {
    pub fn new() -> Self {
        let mut selected_models = HashMap::new();
        selected_models.insert("openai".to_string(), "whisper-1".to_string());
        selected_models.insert("gemini".to_string(), "gemini-2.0-flash".to_string());

        Self {
            enabled: false,
            active_provider: None,
            api_keys: HashMap::new(),
            selected_models,
        }
    }
}

pub fn get_available_providers() -> Vec<CloudSTTProvider> {
    vec![
        CloudSTTProvider {
            id: CloudSTTProviderId::Gemini,
            label: "Google Gemini".to_string(),
            description: "Fast and affordable".to_string(),
            base_url: "https://generativelanguage.googleapis.com".to_string(),
            models: gemini::get_available_models(),
            default_model: "gemini-2.0-flash".to_string(),
            api_key_url: "https://aistudio.google.com/apikey".to_string(),
        },
        CloudSTTProvider {
            id: CloudSTTProviderId::OpenAI,
            label: "OpenAI Whisper".to_string(),
            description: "Industry standard".to_string(),
            base_url: "https://api.openai.com".to_string(),
            models: openai::get_available_models(),
            default_model: "whisper-1".to_string(),
            api_key_url: "https://platform.openai.com/api-keys".to_string(),
        },
    ]
}

pub async fn transcribe(
    provider_id: &str,
    api_key: &str,
    audio_data: Vec<f32>,
    model: &str,
    language: Option<&str>,
) -> Result<String, String> {
    match provider_id {
        "openai" => openai::transcribe(api_key, audio_data, model, language).await,
        "gemini" => gemini::transcribe(api_key, audio_data, model, language).await,
        _ => Err(format!("Unknown provider: {}", provider_id)),
    }
}

pub async fn test_connection(provider_id: &str, api_key: &str) -> Result<bool, String> {
    match provider_id {
        "openai" => openai::test_connection(api_key).await,
        "gemini" => gemini::test_connection(api_key).await,
        _ => Err(format!("Unknown provider: {}", provider_id)),
    }
}
