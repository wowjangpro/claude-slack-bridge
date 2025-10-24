import Store from 'electron-store';
import { AppConfig } from '../shared/types';

interface ConfigSchema {
  config: AppConfig;
}

export class ConfigManager {
  private store: Store<ConfigSchema>;

  constructor() {
    this.store = new Store<ConfigSchema>({
      name: 'claude-slack-bridge-config',
      encryptionKey: 'claude-slack-bridge-secret-key',
    });
  }

  getConfig(): AppConfig | null {
    return this.store.get('config', null);
  }

  setConfig(config: Partial<AppConfig>): void {
    const existing = this.getConfig();
    const merged = existing ? { ...existing, ...config } : config as AppConfig;
    this.store.set('config', merged);
  }

  resetConfig(): void {
    this.store.delete('config');
  }

  hasConfig(): boolean {
    return this.store.has('config');
  }

  validateConfig(config: Partial<AppConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.slackBotToken || !config.slackBotToken.startsWith('xoxb-')) {
      errors.push('유효하지 않은 Slack Bot Token입니다 (xoxb-로 시작해야 함)');
    }

    if (!config.slackAppToken || !config.slackAppToken.startsWith('xapp-')) {
      errors.push('유효하지 않은 Slack App Token입니다 (xapp-로 시작해야 함)');
    }

    if (!config.slackSigningSecret) {
      errors.push('Slack Signing Secret이 필요합니다');
    }

    if (!config.allowedUserIds || config.allowedUserIds.length === 0) {
      errors.push('허용된 사용자 ID가 하나 이상 필요합니다');
    }

    if (!config.workspaceDir) {
      errors.push('작업 디렉토리가 필요합니다');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
