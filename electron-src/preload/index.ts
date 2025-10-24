import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { AppConfig, ConnectionStatus, LogEntry, Statistics, IPC } from '../shared/types';

const api: IPC = {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (config: Partial<AppConfig>) => ipcRenderer.invoke('config:set', config),
    reset: () => ipcRenderer.invoke('config:reset'),
  },
  bridge: {
    start: (config: AppConfig) => ipcRenderer.invoke('bridge:start', config),
    stop: () => ipcRenderer.invoke('bridge:stop'),
    reconnect: () => ipcRenderer.invoke('bridge:reconnect'),
    getStatus: () => ipcRenderer.invoke('bridge:getStatus'),
  },
  logs: {
    subscribe: (callback: (log: LogEntry) => void) => {
      const subscription = (_event: IpcRendererEvent, log: LogEntry) => callback(log);
      ipcRenderer.on('log', subscription);
      // cleanup 함수 반환
      return () => {
        ipcRenderer.removeListener('log', subscription);
      };
    },
    getRecent: (limit?: number) => ipcRenderer.invoke('logs:getRecent', limit),
    clear: () => ipcRenderer.invoke('logs:clear'),
  },
  stats: {
    get: () => ipcRenderer.invoke('stats:get'),
  },
};

contextBridge.exposeInMainWorld('electron', api);

declare global {
  interface Window {
    electron: IPC;
  }
}
