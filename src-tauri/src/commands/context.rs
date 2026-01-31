use crate::context_detection::{browser_bridge::BrowserBridge, DetectedContext};
use crate::settings::{get_settings, write_settings, ContextMapping, ContextStylePrompt};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::RwLock;

pub type BrowserBridgeState = Arc<RwLock<BrowserBridge>>;

#[tauri::command]
#[specta::specta]
pub fn get_context_style_prompts(app: AppHandle) -> Vec<ContextStylePrompt> {
    get_settings(&app).context_style_prompts
}

#[tauri::command]
#[specta::specta]
pub fn update_context_style_prompt(
    app: AppHandle,
    prompt_id: String,
    name: Option<String>,
    description: Option<String>,
    prompt: Option<String>,
) -> Result<(), String> {
    let mut settings = get_settings(&app);

    if let Some(style_prompt) = settings
        .context_style_prompts
        .iter_mut()
        .find(|p| p.id == prompt_id)
    {
        if let Some(n) = name {
            style_prompt.name = n;
        }
        if let Some(d) = description {
            style_prompt.description = d;
        }
        if let Some(p) = prompt {
            style_prompt.prompt = p;
        }
        write_settings(&app, settings);
        Ok(())
    } else {
        Err("Prompt not found".to_string())
    }
}

#[tauri::command]
#[specta::specta]
pub fn reset_context_style_prompt(app: AppHandle, prompt_id: String) -> Result<(), String> {
    let mut settings = get_settings(&app);
    let defaults = crate::settings::get_default_settings();

    if let Some(default_prompt) = defaults
        .context_style_prompts
        .iter()
        .find(|p| p.id == prompt_id)
    {
        if let Some(prompt) = settings
            .context_style_prompts
            .iter_mut()
            .find(|p| p.id == prompt_id)
        {
            *prompt = default_prompt.clone();
            write_settings(&app, settings);
            Ok(())
        } else {
            Err("Prompt not found in settings".to_string())
        }
    } else {
        Err("No default prompt found for this ID".to_string())
    }
}

#[tauri::command]
#[specta::specta]
pub fn get_context_mappings(app: AppHandle) -> Vec<ContextMapping> {
    get_settings(&app).context_mappings
}

#[tauri::command]
#[specta::specta]
pub fn update_context_mapping(
    app: AppHandle,
    app_id: String,
    context_style: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app);

    if let Some(mapping) = settings
        .context_mappings
        .iter_mut()
        .find(|m| m.app_id == app_id)
    {
        mapping.context_style = context_style;
    } else {
        settings.context_mappings.push(ContextMapping {
            app_id,
            context_style,
        });
    }

    write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn delete_context_mapping(app: AppHandle, app_id: String) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.context_mappings.retain(|m| m.app_id != app_id);
    write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_context(
    app: AppHandle,
    bridge: State<'_, BrowserBridgeState>,
) -> Result<DetectedContext, String> {
    use crate::context_detection::context_resolver::ContextResolver;

    let settings = get_settings(&app);
    let resolver = ContextResolver::new(Some(bridge.inner().clone()));
    Ok(resolver.resolve(&settings).await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_browser_bridge_status(
    bridge: State<'_, BrowserBridgeState>,
) -> Result<bool, String> {
    let bridge_guard = bridge.read().await;
    Ok(bridge_guard.get_current_context().await.is_some())
}

#[tauri::command]
#[specta::specta]
pub fn add_context_style_prompt(
    app: AppHandle,
    id: String,
    name: String,
    description: String,
    prompt: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app);

    if settings.context_style_prompts.iter().any(|p| p.id == id) {
        return Err("A prompt with this ID already exists".to_string());
    }

    settings.context_style_prompts.push(ContextStylePrompt {
        id,
        name,
        description,
        prompt,
        is_builtin: false,
    });

    write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn delete_context_style_prompt(app: AppHandle, prompt_id: String) -> Result<(), String> {
    let mut settings = get_settings(&app);

    if let Some(prompt) = settings
        .context_style_prompts
        .iter()
        .find(|p| p.id == prompt_id)
    {
        if prompt.is_builtin {
            return Err("Cannot delete built-in prompts".to_string());
        }
    }

    settings
        .context_style_prompts
        .retain(|p| p.id != prompt_id);
    write_settings(&app, settings);
    Ok(())
}
