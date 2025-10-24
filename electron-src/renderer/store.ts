import { create } from 'zustand';
import { AppConfig, ConnectionStatus, LogEntry, Statistics } from '../shared/types';

interface AppState {
  config: AppConfig | null;
  connectionStatus: ConnectionStatus;
  logs: LogEntry[];
  statistics: Statistics;
  isSetupComplete: boolean;

  setConfig: (config: AppConfig | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addLog: (log: LogEntry) => void;
  setLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
  setStatistics: (stats: Statistics) => void;
  setSetupComplete: (complete: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  config: null,
  connectionStatus: ConnectionStatus.DISCONNECTED,
  logs: [],
  statistics: {
    messageCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    sessionStartTime: null,
    lastActivityTime: null,
  },
  isSetupComplete: false,

  setConfig: (config) => set({ config }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  addLog: (log) => set((state) => {
    // 중복 체크: 동일한 ID의 로그가 이미 있으면 추가하지 않음
    if (state.logs.some(existingLog => existingLog.id === log.id)) {
      return state;
    }
    return { logs: [...state.logs, log] };
  }),
  setLogs: (logs) => set({ logs }),
  clearLogs: () => set({ logs: [] }),
  setStatistics: (stats) => set({ statistics: stats }),
  setSetupComplete: (complete) => set({ isSetupComplete: complete }),
}));
