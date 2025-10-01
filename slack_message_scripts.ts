#!/usr/bin/env tsx

/**
 * Slack MCP Server 메시지 전송 스크립트
 * 
 * 사용법:
 * npm install -g tsx
 * tsx send-slack-message.ts
 */

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
    arguments: SlackMessage;
  };
}

class SlackMCPClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'http://localhost:13080', apiKey: string = 'my-secure-api-key-123') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * MCP 서버에 메시지 전송 요청
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
      console.error('메시지 전송 실패:', error);
      throw error;
    }
  }

  /**
   * 채널 목록 조회
   */
  async getChannels(): Promise<any> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: `channels-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: 'channels_list',
        arguments: {}
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

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('채널 목록 조회 실패:', error);
      throw error;
    }
  }
}

// 사용 예제들
async function examples() {
  const client = new SlackMCPClient();

  console.log('🚀 Slack MCP 메시지 전송 예제\n');

  try {
    // 예제 1: 간단한 텍스트 메시지
    console.log('📝 예제 1: 간단한 텍스트 메시지');
    const simpleMessage = await client.sendMessage({
      channel_id: '#general',
      payload: 'Hello from MCP Server! 👋',
      content_type: 'text/plain'
    });
    console.log('✅ 전송 완료:', simpleMessage);
    console.log('');

    // 예제 2: 마크다운 메시지
    console.log('📝 예제 2: 마크다운 메시지');
    const markdownMessage = await client.sendMessage({
      channel_id: '#general',
      payload: `# 🎉 프로젝트 업데이트