import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ConfigManager } from './config-manager';
import { BridgeManager } from './bridge-manager';
import { setupIpcHandlers, setupIpcEvents } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;
const configManager = new ConfigManager();
const bridgeManager = new BridgeManager();

function createWindow(): void {
  const iconPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../../build/icon.png')
    : path.join(__dirname, '../../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    titleBarStyle: 'hiddenInset',
    title: 'Claude Slack Bridge',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist-vite/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers(configManager, bridgeManager);

  setupIpcEvents(bridgeManager, (channel: string, data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send(channel, data);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await bridgeManager.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await bridgeManager.stop();
});
