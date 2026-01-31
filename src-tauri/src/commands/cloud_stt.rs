use crate::cloud_stt::{self, CloudSTTProvider};
use crate::settings::{get_settings, write_settings};
use tauri::AppHandle;

#[tauri::command]
#[specta::specta]
pub fn get_cloud_stt_providers() -> Vec<CloudSTTProvider> {
    cloud_stt::get_available_providers()
}

#[tauri::command]
#[specta::specta]
pub async fn test_cloud_stt_connection(provider_id: String, api_key: String) -> Result<bool, String> {
    cloud_stt::test_connection(&provider_id, &api_key).await
}

#[tauri::command]
#[specta::specta]
pub fn set_cloud_stt_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.cloud_stt_enabled = enabled;
    write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_cloud_stt_provider(app: AppHandle, provider_id: String) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.cloud_stt_provider = Some(provider_id);
    write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_cloud_stt_api_key(app: AppHandle, provider_id: String, api_key: String) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.cloud_stt_api_keys.insert(provider_id, api_key);
    write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_cloud_stt_model(app: AppHandle, provider_id: String, model_id: String) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.cloud_stt_models.insert(provider_id, model_id);
    write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_cloud_stt_config(
    app: AppHandle,
) -> Result<cloud_stt::CloudSTTConfig, String> {
    let settings = get_settings(&app);
    Ok(cloud_stt::CloudSTTConfig {
        enabled: settings.cloud_stt_enabled,
        active_provider: settings.cloud_stt_provider.clone(),
        api_keys: settings.cloud_stt_api_keys.clone(),
        selected_models: settings.cloud_stt_models.clone(),
    })
}
