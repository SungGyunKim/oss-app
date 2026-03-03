import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import path from "path";
import { APP_USER_AGENT } from "./config";

const windows = new Map<string, BrowserWindow>();

const defaultWebPreferences: Electron.WebPreferences = {
  preload: path.join(__dirname, "../preload/index.js"),
  contextIsolation: true,
  nodeIntegration: false,
  backgroundThrottling: false,
  webviewTag: true,
};

export function createWindow(
  id: string,
  options: BrowserWindowConstructorOptions,
  url?: string,
): BrowserWindow {
  const existing = windows.get(id);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return existing;
  }

  const win = new BrowserWindow({
    title: "OSSTEM",
    icon: path.join(__dirname, "../../assets/icon.ico"),
    ...options,
    webPreferences: {
      ...defaultWebPreferences,
      ...options.webPreferences,
    },
  });

  win.webContents.setUserAgent(
    win.webContents.getUserAgent() + " " + APP_USER_AGENT,
  );

  win.setMenuBarVisibility(false);

  windows.set(id, win);

  win.on("closed", () => {
    windows.delete(id);
  });

  if (url) {
    win.loadURL(url);
  }

  return win;
}

export function getWindow(id: string): BrowserWindow | undefined {
  const win = windows.get(id);
  if (win && !win.isDestroyed()) return win;
  windows.delete(id);
  return undefined;
}

export function closeAll(): void {
  for (const [id, win] of windows) {
    if (!win.isDestroyed()) {
      win.removeAllListeners("close");
      win.close();
    }
    windows.delete(id);
  }
}

export function hideWindow(id: string): void {
  const win = getWindow(id);
  if (win) win.hide();
}

export function showWindow(id: string): void {
  const win = getWindow(id);
  if (win) {
    win.show();
    win.focus();
  }
}
