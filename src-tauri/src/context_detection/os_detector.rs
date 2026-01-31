use log::debug;

#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStringExt;

#[cfg(target_os = "macos")]
use std::process::Command;

#[cfg(target_os = "windows")]
pub fn get_active_window_info() -> Option<(String, String)> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    };
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT, PROCESS_QUERY_LIMITED_INFORMATION,
    };

    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0 .is_null() {
            return None;
        }

        let mut title = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut title);
        let window_title = if len > 0 {
            String::from_utf16_lossy(&title[..len as usize])
        } else {
            String::new()
        };

        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));

        let process_name = if process_id > 0 {
            if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) {
                let mut name = [0u16; 512];
                let mut size = name.len() as u32;
                if QueryFullProcessImageNameW(handle, PROCESS_NAME_FORMAT(0), windows::core::PWSTR(name.as_mut_ptr()), &mut size).is_ok() {
                    let path = OsString::from_wide(&name[..size as usize]);
                    let path_str = path.to_string_lossy();
                    path_str
                        .rsplit(['\\', '/'])
                        .next()
                        .unwrap_or("")
                        .to_string()
                } else {
                    String::new()
                }
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        if process_name.is_empty() && window_title.is_empty() {
            None
        } else {
            Some((process_name, window_title))
        }
    }
}

#[cfg(target_os = "macos")]
pub fn get_active_window_info() -> Option<(String, String)> {
    let script = r#"
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set appName to name of frontApp
            set windowTitle to ""
            try
                set windowTitle to name of front window of frontApp
            end try
            return appName & "|||" & windowTitle
        end tell
    "#;

    let output = Command::new("osascript")
        .args(["-e", script])
        .output()
        .ok()?;

    if !output.status.success() {
        debug!("osascript failed: {:?}", String::from_utf8_lossy(&output.stderr));
        return None;
    }

    let result = String::from_utf8_lossy(&output.stdout);
    let result = result.trim();

    let parts: Vec<&str> = result.split("|||").collect();
    if parts.len() >= 2 {
        Some((parts[0].to_string(), parts[1].to_string()))
    } else if !parts.is_empty() {
        Some((parts[0].to_string(), String::new()))
    } else {
        None
    }
}

#[cfg(target_os = "linux")]
pub fn get_active_window_info() -> Option<(String, String)> {
    use std::process::Command;

    let output = Command::new("xdotool")
        .args(["getactivewindow", "getwindowname"])
        .output()
        .ok()?;

    let window_title = if output.status.success() {
        String::from_utf8_lossy(&output.stdout).trim().to_string()
    } else {
        String::new()
    };

    let pid_output = Command::new("xdotool")
        .args(["getactivewindow", "getwindowpid"])
        .output()
        .ok()?;

    let process_name = if pid_output.status.success() {
        let pid = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
        if let Ok(cmdline) = std::fs::read_to_string(format!("/proc/{}/comm", pid)) {
            cmdline.trim().to_string()
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    if process_name.is_empty() && window_title.is_empty() {
        None
    } else {
        Some((process_name, window_title))
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub fn get_active_window_info() -> Option<(String, String)> {
    None
}

pub fn identify_app(process_name: &str, window_title: &str) -> Option<String> {
    let process_lower = process_name.to_lowercase();
    let title_lower = window_title.to_lowercase();

    match process_lower.as_str() {
        "code" | "code.exe" | "code - insiders" => return Some("vscode".to_string()),
        "cursor" | "cursor.exe" => return Some("cursor".to_string()),
        "slack" | "slack.exe" => return Some("slack".to_string()),
        "discord" | "discord.exe" => return Some("discord".to_string()),
        "notion" | "notion.exe" => return Some("notion".to_string()),
        "obsidian" | "obsidian.exe" => return Some("obsidian".to_string()),
        "outlook" | "outlook.exe" | "microsoft outlook" => return Some("outlook".to_string()),
        "mail" => return Some("apple_mail".to_string()),
        "messages" => return Some("imessage".to_string()),
        "whatsapp" | "whatsapp.exe" => return Some("whatsapp".to_string()),
        "telegram" | "telegram.exe" => return Some("telegram".to_string()),
        "linear" | "linear.exe" => return Some("linear".to_string()),
        "teams" | "teams.exe" | "microsoft teams" => return Some("teams".to_string()),
        _ => {}
    }

    if is_browser(&process_lower) {
        return identify_from_browser_title(&title_lower);
    }

    None
}

pub fn is_browser(process: &str) -> bool {
    matches!(
        process,
        "chrome"
            | "chrome.exe"
            | "google chrome"
            | "msedge"
            | "msedge.exe"
            | "microsoft edge"
            | "firefox"
            | "firefox.exe"
            | "safari"
            | "arc"
            | "brave"
            | "brave.exe"
            | "opera"
            | "opera.exe"
            | "vivaldi"
            | "vivaldi.exe"
    )
}

fn identify_from_browser_title(title: &str) -> Option<String> {
    if title.contains("gmail") || title.contains("inbox - ") {
        return Some("gmail".to_string());
    }
    if title.contains("outlook") && (title.contains("mail") || title.contains("inbox")) {
        return Some("outlook_web".to_string());
    }
    if title.contains("slack") {
        return Some("slack_web".to_string());
    }
    if title.contains("discord") {
        return Some("discord_web".to_string());
    }
    if title.contains("chatgpt") || title.contains("chat.openai") {
        return Some("chatgpt".to_string());
    }
    if title.contains("claude") {
        return Some("claude".to_string());
    }
    if title.contains("notion") {
        return Some("notion_web".to_string());
    }
    if title.contains("linkedin") {
        return Some("linkedin".to_string());
    }
    if title.contains("twitter") || title.contains(" x ") || title.contains("x.com") || title.contains("/ x") {
        return Some("twitter".to_string());
    }
    if title.contains("github") {
        return Some("github".to_string());
    }
    if title.contains("linear") {
        return Some("linear_web".to_string());
    }
    if title.contains("whatsapp") {
        return Some("whatsapp_web".to_string());
    }
    if title.contains("telegram") {
        return Some("telegram_web".to_string());
    }
    if title.contains("teams") {
        return Some("teams_web".to_string());
    }
    None
}

pub fn get_default_context_style(app_id: &str) -> Option<&'static str> {
    match app_id {
        "gmail" | "outlook" | "outlook_web" | "apple_mail" => Some("email_pro"),
        "slack" | "slack_web" | "discord" | "discord_web" | "whatsapp" | "whatsapp_web"
        | "telegram" | "telegram_web" | "imessage" | "teams" | "teams_web" => Some("chat"),
        "vscode" | "cursor" | "jetbrains" => Some("code"),
        "notion" | "notion_web" | "obsidian" => Some("notes"),
        "chatgpt" | "claude" => Some("ai_assistant"),
        "linkedin" => Some("social_pro"),
        "twitter" => Some("social_casual"),
        "github" | "linear" | "linear_web" => Some("dev_tools"),
        _ => None,
    }
}

pub fn get_app_display_name(app_id: &str) -> String {
    match app_id {
        "gmail" => "Gmail".to_string(),
        "outlook" | "outlook_web" => "Outlook".to_string(),
        "apple_mail" => "Apple Mail".to_string(),
        "slack" | "slack_web" => "Slack".to_string(),
        "discord" | "discord_web" => "Discord".to_string(),
        "vscode" => "VS Code".to_string(),
        "cursor" => "Cursor".to_string(),
        "chatgpt" => "ChatGPT".to_string(),
        "claude" => "Claude".to_string(),
        "notion" | "notion_web" => "Notion".to_string(),
        "obsidian" => "Obsidian".to_string(),
        "linkedin" => "LinkedIn".to_string(),
        "twitter" => "Twitter/X".to_string(),
        "whatsapp" | "whatsapp_web" => "WhatsApp".to_string(),
        "telegram" | "telegram_web" => "Telegram".to_string(),
        "github" => "GitHub".to_string(),
        "linear" | "linear_web" => "Linear".to_string(),
        "teams" | "teams_web" => "Microsoft Teams".to_string(),
        "imessage" => "iMessage".to_string(),
        _ => app_id.to_string(),
    }
}
