import { App } from '@slack/bolt';
import { EventEmitter } from 'events';
import { AppConfig, ConnectionStatus, LogEntry } from '../shared/types';
import { ClaudeSessionManager } from './claude-session-manager';
import { v4 as uuidv4 } from 'uuid';

export class BridgeManager extends EventEmitter {
  private app: App | null = null;
  private claudeManager: ClaudeSessionManager | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private config: AppConfig | null = null;
  private logs: LogEntry[] = [];
  private messageCount = 0;
  private errorCount = 0;
  private sessionStartTime: Date | null = null;
  private lastActivityTime: Date | null = null;
  private responseTimes: number[] = [];

  async start(config: AppConfig): Promise<{ success: boolean; error?: string }> {
    try {
      this.config = config;
      this.status = ConnectionStatus.CONNECTING;
      this.emit('status-changed', this.status);

      this.addLog({
        type: 'system',
        content: 'Slack Bot 연결 시작...',
      });

      this.app = new App({
        token: config.slackBotToken,
        signingSecret: config.slackSigningSecret,
        socketMode: true,
        appToken: config.slackAppToken,
      });

      this.claudeManager = new ClaudeSessionManager(
        config.workspaceDir,
        config.claudePath || 'claude'
      );

      this.setupEventHandlers();

      await this.app.start();

      this.status = ConnectionStatus.CONNECTED;
      this.sessionStartTime = new Date();
      this.emit('status-changed', this.status);

      this.addLog({
        type: 'system',
        content: '✅ Slack Bot 연결 성공',
      });

      return { success: true };
    } catch (error: any) {
      this.status = ConnectionStatus.ERROR;
      this.emit('status-changed', this.status);

      const errorMsg = error?.message || '알 수 없는 오류';
      this.addLog({
        type: 'error',
        content: `❌ 연결 실패: ${errorMsg}`,
      });

      this.errorCount++;

      return { success: false, error: errorMsg };
    }
  }

  async stop(): Promise<void> {
    if (this.app) {
      await this.app.stop();
      this.app = null;
    }

    if (this.claudeManager) {
      this.claudeManager.closeAllSessions();
      this.claudeManager = null;
    }

    this.status = ConnectionStatus.DISCONNECTED;
    this.sessionStartTime = null;
    this.emit('status-changed', this.status);

    this.addLog({
      type: 'system',
      content: 'Slack Bot 연결 종료',
    });
  }

  async reconnect(): Promise<{ success: boolean; error?: string }> {
    await this.stop();
    if (!this.config) {
      return { success: false, error: '설정이 없습니다' };
    }
    return await this.start(this.config);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStatistics() {
    const avgResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;

    return {
      messageCount: this.messageCount,
      averageResponseTime: avgResponseTime,
      errorCount: this.errorCount,
      sessionStartTime: this.sessionStartTime,
      lastActivityTime: this.lastActivityTime,
    };
  }

  private setupEventHandlers(): void {
    if (!this.app || !this.claudeManager || !this.config) return;

    const allowedUserIds = this.config.allowedUserIds;

    this.claudeManager.on('message', async (channelId: string, message: any) => {
      const responseTime = Date.now();

      let text = '';
      if (message.type === 'text') {
        text = message.content;
      } else if (message.type === 'message' && message.role === 'assistant') {
        text = Array.isArray(message.content)
          ? message.content.map((c: any) => c.text || c.type).join('\n')
          : message.content;
      } else if (message.type === 'error') {
        text = `❌ 오류: ${message.error}`;
        this.errorCount++;
      }

      if (text) {
        await this.app!.client.chat.postMessage({
          token: this.config!.slackBotToken,
          channel: channelId,
          text: text,
        });

        this.addLog({
          type: 'claude_message',
          channelId,
          content: text,
        });

        this.lastActivityTime = new Date();
      }
    });

    this.claudeManager.on('error', async (channelId: string, errorMsg: string) => {
      this.errorCount++;

      await this.app!.client.chat.postMessage({
        token: this.config!.slackBotToken,
        channel: channelId,
        text: `❌ Claude 오류: ${errorMsg}`,
      });

      this.addLog({
        type: 'error',
        channelId,
        content: `❌ Claude 오류: ${errorMsg}`,
      });
    });

    this.claudeManager.on('waiting', async (channelId: string, waitMsg: string) => {
      await this.app!.client.chat.postMessage({
        token: this.config!.slackBotToken,
        channel: channelId,
        text: waitMsg,
      });

      this.addLog({
        type: 'waiting',
        channelId,
        content: waitMsg,
      });
    });

    this.claudeManager.on('stream', async (channelId: string, text: string) => {
      await this.app!.client.chat.postMessage({
        token: this.config!.slackBotToken,
        channel: channelId,
        text: text,
      });

      this.addLog({
        type: 'claude_message',
        channelId,
        content: text,
      });
    });

    this.claudeManager.on('tool_use', async (channelId: string, toolName: string, toolInfo: string) => {
      await this.app!.client.chat.postMessage({
        token: this.config!.slackBotToken,
        channel: channelId,
        text: toolInfo,
      });

      this.addLog({
        type: 'tool_use',
        channelId,
        content: toolInfo,
        metadata: { toolName },
      });
    });

    this.app.message(async ({ message, say }) => {
      if (message.subtype === 'bot_message') return;

      const msg = message as any;
      const userId = msg.user;
      const channel = msg.channel;
      const channelType = msg.channel_type;
      const isDM = channelType === 'im' || channel.startsWith('D');

      if (!isDM) return;

      if (!allowedUserIds.includes(userId || '') && !allowedUserIds.includes(channel)) {
        await say('❌ 이 봇을 사용할 권한이 없습니다.');
        return;
      }

      const text = msg.text ? msg.text.replace(/<@[A-Z0-9]+>/g, '').trim() : '';

      this.messageCount++;
      this.lastActivityTime = new Date();

      this.addLog({
        type: 'user_message',
        userId,
        channelId: channel,
        content: text,
      });

      try {
        this.claudeManager!.sendMessage(channel, text);
      } catch (error: any) {
        this.errorCount++;
        await say(`❌ 오류: ${error?.message || '알 수 없는 오류'}`);
      }
    });

    this.app.event('app_mention', async ({ event, say }) => {
      const userId = event.user;
      const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
      const channel = event.channel;

      if (!allowedUserIds.includes(userId || '') && !allowedUserIds.includes(channel)) {
        await say('❌ 이 봇을 사용할 권한이 없습니다.');
        return;
      }

      this.messageCount++;
      this.lastActivityTime = new Date();

      this.addLog({
        type: 'user_message',
        userId,
        channelId: channel,
        content: text,
      });

      try {
        this.claudeManager!.sendMessage(channel, text);
      } catch (error: any) {
        this.errorCount++;
        await say(`❌ 오류: ${error?.message || '알 수 없는 오류'}`);
      }
    });
  }

  private addLog(params: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const log: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...params,
    };

    this.logs.push(log);

    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    this.emit('log', log);
  }
}
