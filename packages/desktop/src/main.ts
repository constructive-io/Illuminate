import path from 'node:path';

import { app, BrowserWindow, nativeTheme } from 'electron';
import started from 'electron-squirrel-startup';

import { registerAllIpc } from '@/main/ipc';
import { resetLaserView } from '@/main/laser-view';
import { runtime } from '@/main/runtime';

if (started) app.quit();

app.setName('Wavegrid Desktop');

// One shared store (~/.wavegrid) can't tolerate two Desktop instances fighting
// over it; quit a second launch and focus the existing window. Dev runs are
// left alone so multiple worktrees can coexist.
if (app.isPackaged && !app.requestSingleInstanceLock()) app.quit();

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  runtime.mainWindow = win;

  win.once('ready-to-show', () => win.show());

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  win.on('closed', () => {
    runtime.mainWindow = null;
    resetLaserView();
  });
}

registerAllIpc();

process.on('uncaughtException', (err) => console.error('[main] uncaughtException:', err));
process.on('unhandledRejection', (reason) => console.error('[main] unhandledRejection:', reason));

app.on('ready', createWindow);

app.on('second-instance', () => {
  const win = runtime.mainWindow;
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
