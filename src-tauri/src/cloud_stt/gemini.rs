use super::audio_encoder::f32_to_wav_base64;
use super::CloudSTTModel;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};

const GEMINI_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_SECS: u64 = 60;

#[derive(Debug, Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
}

#[derive(Debug, Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
enum GeminiPart {
    Text { text: String },
    InlineData { inline_data: GeminiInlineData },
}

#[derive(Debug, Serialize)]
struct GeminiInlineData {
    mime_type: String,
    data: String,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
    error: Option<GeminiError>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiResponseContent,
}

#[derive(Debug, Deserialize)]
struct GeminiResponseContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(Debug, Deserialize)]
struct GeminiResponsePart {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GeminiError {
    message: String,
    status: Option<String>,
    #[allow(dead_code)]
    code: Option<i32>,
}

pub fn get_available_models() -> Vec<CloudSTTModel> {
    vec![
        CloudSTTModel {
            id: "gemini-2.0-flash".to_string(),
            name: "Gemini 2.0 Flash".to_string(),
            description: "Fast and capable - Recommended".to_string(),
        },
        CloudSTTModel {
            id: "gemini-2.5-flash-preview-05-20".to_string(),
            name: "Gemini 2.5 Flash Preview".to_string(),
            description: "Latest preview with improved accuracy".to_string(),
        },
        CloudSTTModel {
            id: "gemini-2.5-pro-preview-05-06".to_string(),
            name: "Gemini 2.5 Pro Preview".to_string(),
            description: "Most accurate, higher latency".to_string(),
        },
        CloudSTTModel {
            id: "gemini-1.5-flash".to_string(),
            name: "Gemini 1.5 Flash".to_string(),
            description: "Stable version".to_string(),
        },
    ]
}

fn build_transcription_prompt(language: Option<&str>) -> String {
    let base_prompt =
        "Transcribe this audio accurately. Return only the transcription text, nothing else.";

    match language {
        Some(lang) => format!(
            "{} The audio is in {} language. Transcribe in that language.",
            base_prompt, lang
        ),
        None => base_prompt.to_string(),
    }
}

pub async fn transcribe(
    api_key: &str,
    audio_data: Vec<f32>,
    model: &str,
    language: Option<&str>,
) -> Result<String, String> {
    info!(
        "Gemini transcribe: model={}, audio_samples={}, language={:?}",
        model,
        audio_data.len(),
        language
    );

    let audio_base64 = f32_to_wav_base64(&audio_data, 16000)?;
    debug!("Converted audio to base64: {} chars", audio_base64.len());

    let prompt = build_transcription_prompt(language);

    let request = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![
                GeminiPart::InlineData {
                    inline_data: GeminiInlineData {
                        mime_type: "audio/wav".to_string(),
                        data: audio_base64,
                    },
                },
                GeminiPart::Text { text: prompt },
            ],
        }],
    };

    let url = format!(
        "{}{}:generateContent?key={}",
        GEMINI_API_URL, model, api_key
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            error!("Gemini API request failed: {}", e);
            if e.is_timeout() {
                "Request timeout - please try again".to_string()
            } else if e.is_connect() {
                "Network error - please check your connection".to_string()
            } else {
                format!("Request failed: {}", e)
            }
        })?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    debug!("Gemini API response status: {}", status);

    if !status.is_success() {
        error!(
            "Gemini API error: status={}, body={}",
            status, response_text
        );

        if let Ok(gemini_response) = serde_json::from_str::<GeminiResponse>(&response_text) {
            if let Some(error) = gemini_response.error {
                let error_msg = match error.status.as_deref() {
                    Some("INVALID_ARGUMENT") => {
                        if error.message.contains("API key") {
                            "Invalid API key".to_string()
                        } else {
                            error.message
                        }
                    }
                    Some("PERMISSION_DENIED") => "Invalid API key".to_string(),
                    Some("RESOURCE_EXHAUSTED") => {
                        "API quota exceeded - please check your account".to_string()
                    }
                    _ => error.message,
                };
                return Err(error_msg);
            }
        }

        return Err(format!("API error ({}): {}", status, response_text));
    }

    let gemini_response: GeminiResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(error) = gemini_response.error {
        return Err(error.message);
    }

    let text = gemini_response
        .candidates
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.content.parts.into_iter().next())
        .and_then(|p| p.text)
        .ok_or_else(|| "No transcription text in response".to_string())?;

    info!("Transcription successful: {} chars", text.len());
    Ok(text.trim().to_string())
}

pub async fn test_connection(api_key: &str) -> Result<bool, String> {
    info!("Testing Gemini API connection");

    let url = format!(
        "{}/gemini-2.0-flash:generateContent?key={}",
        GEMINI_API_URL, api_key
    );

    let request = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart::Text {
                text: "Say 'ok'".to_string(),
            }],
        }],
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Connection timeout".to_string()
            } else if e.is_connect() {
                "Network error - please check your connection".to_string()
            } else {
                format!("Connection failed: {}", e)
            }
        })?;

    let status = response.status();

    if status.is_success() {
        info!("Gemini API connection test successful");
        Ok(true)
    } else if status.as_u16() == 400 || status.as_u16() == 403 {
        let response_text = response.text().await.unwrap_or_default();
        if response_text.contains("API key") {
            Err("Invalid API key".to_string())
        } else {
            Err(format!("API error: {}", status))
        }
    } else {
        let response_text = response.text().await.unwrap_or_default();
        error!(
            "Gemini API connection test failed: status={}, body={}",
            status, response_text
        );
        Err(format!("API error: {}", status))
    }
}
