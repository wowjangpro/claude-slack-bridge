export interface AppConfig {
  slackBotToken: string;
  slackAppToken: string;
  slackSigningSecret: string;
  botUserId: string;
  allowedUserIds: string[];
  workspaceDir: string;
  claudePath?: string;
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'user_message' | 'claude_message' | 'system' | 'tool_use' | 'error' | 'waiting';
  userId?: string;
  channelId?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface Statistics {
  messageCount: number;
  averageResponseTime: number;
  errorCount: number;
  sessionStartTime: Date | null;
  lastActivityTime: Date | null;
}

export interface IPC {
  config: {
    get: () => Promise<AppConfig | null>;
    set: (config: Partial<AppConfig>) => Promise<void>;
    reset: () => Promise<void>;
  };
  bridge: {
    start: (config: AppConfig) => Promise<{ success: boolean; error?: string }>;
    stop: () => Promise<void>;
    reconnect: () => Promise<{ success: boolean; error?: string }>;
    getStatus: () => Promise<ConnectionStatus>;
  };
  logs: {
    subscribe: (callback: (log: LogEntry) => void) => void;
    getRecent: (limit?: number) => Promise<LogEntry[]>;
    clear: () => Promise<void>;
  };
  stats: {
    get: () => Promise<Statistics>;
  };
}
