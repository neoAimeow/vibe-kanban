import { invoke } from '@tauri-apps/api/core';

// Helper to check if running in Tauri
// Tauri v2 exposes window.__TAURI_INTERNALS__
export const isTauri = () => '__TAURI_INTERNALS__' in window;

let backendUrl = '';

export const initTauriBackend = async () => {
  if (!isTauri()) return;

  console.log('Initializing Tauri adapter...');

  try {
    // Poll for port
    let port = 0;
    // Try for 15 seconds (30 attempts * 500ms)
    for (let i = 0; i < 30; i++) {
      try {
        port = await invoke<number>('get_server_port');
        if (port > 0) break;
      } catch (e) {
        // Ignore error while polling
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (port > 0) {
      backendUrl = `http://localhost:${port}`;
      console.log('Tauri backend connected on', backendUrl);

      // Override global fetch
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        let finalInput = input;
        
        // Handle string URLs
        if (typeof input === 'string') {
          if (input.startsWith('/api')) {
             finalInput = `${backendUrl}${input}`;
          }
        } 
        // Handle URL objects
        else if (input instanceof URL) {
           if (input.pathname.startsWith('/api')) {
              finalInput = `${backendUrl}${input.pathname}${input.search}`;
           }
        }
        // Handle Request objects (basic support)
        else if (input instanceof Request) {
            const url = new URL(input.url);
            // Check if it's a relative API call resolved to current origin
            if (url.pathname.startsWith('/api')) {
                // Create new request with backend URL
                finalInput = new Request(`${backendUrl}${url.pathname}${url.search}`, input);
            }
        }

        return originalFetch(finalInput, init);
      };
    } else {
      console.error('Failed to get backend port from Tauri sidecar');
    }
  } catch (e) {
    console.error('Tauri init error:', e);
  }
};
