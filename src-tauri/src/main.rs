#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, fs};

use tauri::Manager;
use tauri_plugin_shell::{ShellExt, process::CommandEvent};

#[tauri::command]
async fn get_server_port() -> Result<u16, String> {
    let dir = env::temp_dir().join("vibe-kanban");
    let path = dir.join("vibe-kanban.port");

    // Simple read, let frontend handle retries
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read port file at {:?}: {}", path, e))?;
    content
        .trim()
        .parse()
        .map_err(|e| format!("Failed to parse port: {}", e))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_server_port])
        .setup(|app| {
            // Only start sidecar in release mode.
            // In dev mode, we assume the user is running the backend manually (or via beforeDevCommand).
            #[cfg(not(debug_assertions))]
            {
                let sidecar_command = app.shell().sidecar("server").map_err(|e| e.to_string())?;
                let (mut rx, _child) = sidecar_command.spawn().map_err(|e| e.to_string())?;

                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                let log = String::from_utf8_lossy(&line);
                                println!("[SERVER] {}", log);
                            }
                            CommandEvent::Stderr(line) => {
                                let log = String::from_utf8_lossy(&line);
                                eprintln!("[SERVER] {}", log);
                            }
                            _ => {}
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
