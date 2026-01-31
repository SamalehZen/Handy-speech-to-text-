use super::audio_encoder::f32_to_wav_bytes;
use super::CloudSTTModel;
use log::{debug, error, info};
use reqwest::multipart::{Form, Part};
use serde::Deserialize;

const OPENAI_API_URL: &str = "https://api.openai.com/v1/audio/transcriptions";
const REQUEST_TIMEOUT_SECS: u64 = 60;

#[derive(Debug, Deserialize)]
struct OpenAITranscriptionResponse {
    text: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIErrorResponse {
    error: OpenAIError,
}

#[derive(Debug, Deserialize)]
struct OpenAIError {
    message: String,
    #[serde(rename = "type")]
    error_type: Option<String>,
    code: Option<String>,
}

pub fn get_available_models() -> Vec<CloudSTTModel> {
    vec![
        CloudSTTModel {
            id: "whisper-1".to_string(),
            name: "Whisper".to_string(),
            description: "OpenAI Whisper - Fast and accurate".to_string(),
        },
        CloudSTTModel {
            id: "gpt-4o-transcribe".to_string(),
            name: "GPT-4o Transcribe".to_string(),
            description: "Advanced transcription model".to_string(),
        },
        CloudSTTModel {
            id: "gpt-4o-mini-transcribe".to_string(),
            name: "GPT-4o Mini Transcribe".to_string(),
            description: "Faster, more affordable transcription".to_string(),
        },
    ]
}

pub async fn transcribe(
    api_key: &str,
    audio_data: Vec<f32>,
    model: &str,
    language: Option<&str>,
) -> Result<String, String> {
    info!(
        "OpenAI transcribe: model={}, audio_samples={}, language={:?}",
        model,
        audio_data.len(),
        language
    );

    let wav_bytes = f32_to_wav_bytes(&audio_data, 16000)?;
    debug!("Converted audio to WAV: {} bytes", wav_bytes.len());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let file_part = Part::bytes(wav_bytes)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to create file part: {}", e))?;

    let mut form = Form::new()
        .part("file", file_part)
        .text("model", model.to_string())
        .text("response_format", "json");

    if let Some(lang) = language {
        form = form.text("language", lang.to_string());
    }

    let response = client
        .post(OPENAI_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            error!("OpenAI API request failed: {}", e);
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

    debug!("OpenAI API response status: {}", status);

    if !status.is_success() {
        error!("OpenAI API error: status={}, body={}", status, response_text);

        if let Ok(error_response) = serde_json::from_str::<OpenAIErrorResponse>(&response_text) {
            let error_msg = match error_response.error.code.as_deref() {
                Some("invalid_api_key") => "Invalid API key".to_string(),
                Some("insufficient_quota") => {
                    "API quota exceeded - please check your account".to_string()
                }
                Some("rate_limit_exceeded") => {
                    "Rate limit exceeded - please wait and try again".to_string()
                }
                _ => error_response.error.message,
            };
            return Err(error_msg);
        }

        return Err(format!("API error ({}): {}", status, response_text));
    }

    let transcription: OpenAITranscriptionResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    info!("Transcription successful: {} chars", transcription.text.len());
    Ok(transcription.text)
}

pub async fn test_connection(api_key: &str) -> Result<bool, String> {
    info!("Testing OpenAI API connection");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
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
        info!("OpenAI API connection test successful");
        Ok(true)
    } else if status.as_u16() == 401 {
        Err("Invalid API key".to_string())
    } else {
        let response_text = response.text().await.unwrap_or_default();
        error!(
            "OpenAI API connection test failed: status={}, body={}",
            status, response_text
        );
        Err(format!("API error: {}", status))
    }
}
