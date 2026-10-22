#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{fs, path::{Component, Path, PathBuf}};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
struct Directory {
    kind: &'static str,
    name: String,
    path: String,
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_config_dir().map(|path| path.join("filter-directory.json"))
        .map_err(|error| format!("无法读取设置目录：{error}"))
}

fn stored_directory(app: &tauri::AppHandle) -> Result<Option<PathBuf>, String> {
    let path = settings_path(app)?;
    match fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|error| format!("目录设置已损坏，请重新选择目录：{error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("无法读取目录设置：{error}")),
    }
}

fn describe_directory(path: PathBuf) -> Directory {
    Directory {
        kind: "desktop",
        name: path.file_name().unwrap_or(path.as_os_str()).to_string_lossy().into_owned(),
        path: path.to_string_lossy().into_owned(),
    }
}

#[tauri::command]
fn read_filter_directory(app: tauri::AppHandle) -> Result<Option<Directory>, String> {
    Ok(stored_directory(&app)?.map(describe_directory))
}

#[tauri::command]
async fn pick_filter_directory(app: tauri::AppHandle) -> Result<Option<Directory>, String> {
    let mut dialog = app.dialog().file().set_title("选择过滤器存放目录");
    if let Ok(Some(path)) = stored_directory(&app) {
        dialog = dialog.set_directory(path);
    }
    let Some(selected) = dialog.blocking_pick_folder() else { return Ok(None) };
    let path = selected.into_path().map_err(|error| error.to_string())?;
    let path = fs::canonicalize(path).map_err(|error| format!("无法访问所选目录：{error}"))?;
    if !path.is_dir() { return Err("所选位置不是文件夹，请重新选择。".into()) }
    let settings = settings_path(&app)?;
    fs::create_dir_all(settings.parent().unwrap()).map_err(|error| format!("无法创建设置目录：{error}"))?;
    let contents = serde_json::to_vec(&Some(&path)).map_err(|error| error.to_string())?;
    fs::write(settings, contents).map_err(|error| format!("无法保存目录设置：{error}"))?;
    Ok(Some(describe_directory(path)))
}

#[tauri::command]
fn clear_filter_directory(app: tauri::AppHandle) -> Result<(), String> {
    match fs::remove_file(settings_path(&app)?) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("无法清除目录设置：{error}")),
    }
}

fn validate_filename(filename: &str) -> Result<(), String> {
    let mut components = Path::new(filename).components();
    let single_name = matches!(components.next(), Some(Component::Normal(_))) && components.next().is_none();
    if !single_name || !filename.ends_with(".filter") || filename.chars().any(|c| c.is_control() || "<>:\"/\\|?*".contains(c)) {
        return Err("无效的过滤器文件名。".into());
    }
    Ok(())
}

#[tauri::command]
async fn export_filter(app: tauri::AppHandle, filename: String, source: String) -> Result<(), String> {
    validate_filename(&filename)?;
    let directory = stored_directory(&app)?.ok_or("请先选择过滤器存放目录。")?;
    if !directory.is_dir() { return Err("所选目录已移动或删除，请在设置中重新选择。".into()) }
    let target = directory.join(filename);
    // Do not follow a file link out of the user-selected directory.
    if fs::symlink_metadata(&target).is_ok_and(|metadata| metadata.file_type().is_symlink()) {
        return Err("目标文件是符号链接，请更换文件名后导出。".into());
    }
    fs::write(target, source.as_bytes()).map_err(|error| format!("导出失败，请检查目录写入权限及可用空间：{error}"))
}

#[tauri::command]
async fn save_filter(app: tauri::AppHandle, filename: String, source: String) -> Result<bool, String> {
    validate_filename(&filename)?;
    let selected = app.dialog().file().set_title("导出过滤器")
        .add_filter("PoE 2 过滤器", &["filter"]).set_file_name(filename).blocking_save_file();
    let Some(selected) = selected else { return Ok(false) };
    let path = selected.into_path().map_err(|error| error.to_string())?;
    fs::write(path, source.as_bytes()).map_err(|error| format!("导出失败，请检查写入权限及可用空间：{error}"))?;
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_filter_directory, pick_filter_directory, clear_filter_directory, export_filter, save_filter])
        .run(tauri::generate_context!())
        .expect("无法启动 Exile Forge");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_names_cannot_escape_the_selected_directory() {
        for name in ["../evil.filter", "..\\evil.filter", "C:\\evil.filter", "/evil.filter", "x.filter:stream", "x.txt", "a\0.filter"] {
            assert!(validate_filename(name).is_err(), "{name:?}");
        }
        assert!(validate_filename("我的过滤器.filter").is_ok());
    }
}
