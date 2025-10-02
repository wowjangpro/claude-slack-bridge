import { App } from '@slack/bolt';
import { config } from 'dotenv';
import { ClaudeSessionManager } from './claude-session-manager';

config();

// 허용된 사용자 ID 확인 (필수)
const allowedUserIds = process.env.ALLOWED_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];
if (allowedUserIds.length === 0) {
  console.error('❌ ALLOWED_USER_IDS 환경 변수가 설정되지 않았습니다!');
  console.error('   .env 파일에 ALLOWED_USER_IDS=U12345ABC,U67890DEF 형식으로 설정해주세요.');
  process.exit(1);
}

console.log(`✅ 허용된 사용자 ID: ${allowedUserIds.join(', ')}`);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: parseInt(process.env.PORT || '3000')
});

const claudeManager = new ClaudeSessionManager(
  process.env.WORKSPACE_DIR || process.cwd(),
  process.env.CLAUDE_PATH || 'claude'
);

// Claude 응답을 Slack으로 전달
claudeManager.on('message', async (channelId: string, message: any) => {
  console.log(`[Claude 응답] Channel ${channelId}:`, JSON.stringify(message).substring(0, 100));

  try {
    // Claude의 응답 타입에 따라 처리
    let text = '';
    if (message.type === 'text') {
      text = message.content;
    } else if (message.type === 'message' && message.role === 'assistant') {
      text = Array.isArray(message.content)
        ? message.content.map((c: any) => c.text || c.type).join('\n')
        : message.content;
    } else if (message.type === 'error') {
      text = `❌ 오류: ${message.error}`;
    }

    if (text) {
      await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channelId,
        text: text
      });
      console.log(`[Slack 전송 성공] Channel ${channelId}`);
    }
  } catch (error) {
    console.error('[Slack 전송 오류]:', error);
  }
});

// Claude 에러를 Slack으로 전달
claudeManager.on('error', async (channelId: string, errorMsg: string) => {
  console.error(`[Claude 에러] Channel ${channelId}:`, errorMsg);

  try {
    await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      text: `❌ Claude 오류: ${errorMsg}`
    });
  } catch (error) {
    console.error('[Slack 전송 오류]:', error);
  }
});

// Claude 대기중 메시지를 Slack으로 전달
claudeManager.on('waiting', async (channelId: string, waitMsg: string) => {
  console.log(`[Claude 대기중] Channel ${channelId}:`, waitMsg);

  try {
    await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      text: waitMsg
    });
  } catch (error) {
    console.error('[Slack 전송 오류]:', error);
  }
});

// Claude 스트리밍 응답을 Slack으로 전달
claudeManager.on('stream', async (channelId: string, text: string) => {
  console.log(`[스트리밍] Channel ${channelId}: ${text.substring(0, 100)}...`);

  try {
    await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      text: text
    });
  } catch (error) {
    console.error('[Slack 전송 오류]:', error);
  }
});

// Claude 도구 사용 알림을 Slack으로 전달
claudeManager.on('tool_use', async (channelId: string, toolName: string, toolInfo: string) => {
  console.log(`[도구 사용] Channel ${channelId}: ${toolName}`);

  try {
    await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      text: toolInfo
    });
  } catch (error) {
    console.error('[Slack 전송 오류]:', error);
  }
});

// Slack 메시지 수신
app.message(async ({ message, say }) => {
  // 봇 자신의 메시지는 무시
  if (message.subtype === 'bot_message') {
    return;
  }

  const msg = message as any;
  const userId = msg.user;
  const channel = msg.channel;
  const channelType = msg.channel_type;

  // 디버그: 모든 메시지 정보 출력
  console.log(`[디버그] 메시지 수신:`, {
    userId,
    channel,
    channelType,
    allowedUserIds,
    isAllowed: allowedUserIds.includes(channel),
    text: msg.text?.substring(0, 50)
  });

  // DM 채널인지 확인 (channel_type이 'im'이면 DM)
  const isDM = channelType === 'im' || channel.startsWith('D');

  // 일반 채널에서는 app.message를 무시 (app_mention에서만 처리)
  if (!isDM) {
    return;
  }

  // 사용자 또는 채널 권한 확인
  if (!allowedUserIds.includes(userId || '') && !allowedUserIds.includes(channel)) {
    console.log(`[권한 없음] User ${userId} (Channel ${channel})`);
    await say('❌ 이 봇을 사용할 권한이 없습니다. 관리자에게 문의하세요.');
    return;
  }

  // 멘션 제거
  const text = msg.text ? msg.text.replace(/<@[A-Z0-9]+>/g, '').trim() : '';

  console.log(`[Slack 메시지] User ${userId} in ${channel} (${isDM ? 'DM' : '채널'}): ${text}`);

  try {
    // Claude에게 메시지 전송
    claudeManager.sendMessage(channel, text);
  } catch (error) {
    console.error('[Claude 전송 오류]:', error);
    await say(`❌ 오류가 발생했습니다: ${error}`);
  }
});

// 앱 멘션 이벤트
app.event('app_mention', async ({ event, say }) => {
  const userId = event.user;
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
  const channel = event.channel;

  // 사용자 또는 채널 권한 확인
  if (!allowedUserIds.includes(userId || '') && !allowedUserIds.includes(channel)) {
    console.log(`[권한 없음] User ${userId} (Channel ${channel})`);
    await say('❌ 이 봇을 사용할 권한이 없습니다. 관리자에게 문의하세요.');
    return;
  }

  console.log(`[앱 멘션] User ${userId}: ${text}`);

  try {
    claudeManager.sendMessage(channel, text);
  } catch (error) {
    console.error('[Claude 전송 오류]:', error);
    await say(`❌ 오류가 발생했습니다: ${error}`);
  }
});

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n[종료 중] 모든 세션 정리...');
  claudeManager.closeAllSessions();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[종료 중] 모든 세션 정리...');
  claudeManager.closeAllSessions();
  process.exit(0);
});

// 앱 시작
(async () => {
  await app.start();
  console.log('⚡️ Claude-Slack Bridge 서버가 실행 중입니다!');
  console.log(`활성 세션: ${claudeManager.getActiveSessionCount()}`);
})();
