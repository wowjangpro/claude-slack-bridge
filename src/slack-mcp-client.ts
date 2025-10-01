interface SlackMessage {
  channel_id: string;
  payload: string;
  content_type?: 'text/plain' | 'text/markdown';
  thread_ts?: string;
}

interface MCPRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: {
    name: string;
    arguments: any;
  };
}

export class SlackMCPClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(
    baseUrl: string = process.env.SLACK_MCP_URL || 'http://localhost:13080',
    apiKey: string = process.env.SLACK_MCP_API_KEY || 'JenieL-cc-slack-mcp-secret-2012'
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Slack 채널에 메시지 전송
   */
  async sendMessage(message: SlackMessage): Promise<any> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: `msg-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: 'conversations_add_message',
        arguments: message
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[Slack MCP] 메시지 전송 실패:', error);
      throw error;
    }
  }

  /**
   * 채널에 Claude 응답 전송
   */
  async sendClaudeResponse(channelId: string, response: string, threadTs?: string): Promise<void> {
    await this.sendMessage({
      channel_id: channelId,
      payload: response,
      content_type: 'text/markdown',
      thread_ts: threadTs
    });
  }
}
