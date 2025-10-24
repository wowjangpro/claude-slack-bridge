import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { ConfigManager } from './config-manager';
import { BridgeManager } from './bridge-manager';
import { AppConfig, ConnectionStatus, LogEntry, Statistics } from '../shared/types';

export function setupIpcHandlers(
  configManager: ConfigManager,
  bridgeManager: BridgeManager
): void {
  ipcMain.handle('config:get', async (): Promise<AppConfig | null> => {
    return configManager.getConfig();
  });

  ipcMain.handle('config:set', async (_event: IpcMainInvokeEvent, config: Partial<AppConfig>): Promise<void> => {
    configManager.setConfig(config);
  });

  ipcMain.handle('config:reset', async (): Promise<void> => {
    configManager.resetConfig();
  });

  ipcMain.handle('config:validate', async (_event: IpcMainInvokeEvent, config: Partial<AppConfig>): Promise<{ valid: boolean; errors: string[] }> => {
    return configManager.validateConfig(config);
  });

  ipcMain.handle('bridge:start', async (_event: IpcMainInvokeEvent, config: AppConfig): Promise<{ success: boolean; error?: string }> => {
    console.log('[IPC] bridge:start 호출됨', { workspaceDir: config.workspaceDir });
    try {
      const result = await bridgeManager.start(config);
      console.log('[IPC] bridge:start 결과:', result);
      return result;
    } catch (error: any) {
      console.error('[IPC] bridge:start 오류:', error);
      return { success: false, error: error?.message || '알 수 없는 오류' };
    }
  });

  ipcMain.handle('bridge:stop', async (): Promise<void> => {
    await bridgeManager.stop();
  });

  ipcMain.handle('bridge:reconnect', async (): Promise<{ success: boolean; error?: string }> => {
    const config = configManager.getConfig();
    if (!config) {
      return { success: false, error: '설정이 없습니다' };
    }
    await bridgeManager.stop();
    return await bridgeManager.start(config);
  });

  ipcMain.handle('bridge:getStatus', async (): Promise<ConnectionStatus> => {
    return bridgeManager.getStatus();
  });

  ipcMain.handle('logs:getRecent', async (_event: IpcMainInvokeEvent, limit?: number): Promise<LogEntry[]> => {
    return bridgeManager.getRecentLogs(limit);
  });

  ipcMain.handle('logs:clear', async (): Promise<void> => {
    bridgeManager.clearLogs();
  });

  ipcMain.handle('stats:get', async (): Promise<Statistics> => {
    return bridgeManager.getStatistics();
  });
}

export function setupIpcEvents(bridgeManager: BridgeManager, sendToRenderer: (channel: string, data: any) => void): void {
  bridgeManager.on('log', (log: LogEntry) => {
    sendToRenderer('log', log);
  });

  bridgeManager.on('status-changed', (status: ConnectionStatus) => {
    sendToRenderer('status-changed', status);
  });
}
