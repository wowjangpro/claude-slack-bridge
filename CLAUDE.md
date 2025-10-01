# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Slack과 Claude Code 간 양방향 실시간 대화를 지원하는 브리지 시스템입니다. Slack에서 Claude Code와 연속적인 세션을 유지하며 대화하고, Claude가 실제 파일 시스템과 도구에 접근하여 작업을 수행할 수 있습니다.

### 사용 시나리오

```
사용자: @Claude 지금 남은 작업 알려줘
Claude: 현재 5개의 작업이 남아있습니다...

사용자: 다음 작업 계속 진행해줘
Claude: [파일 분석 → 코드 작성] 완료했습니다!
```

## 프로젝트 상태

**현재 상태**: ✅ 구현 완료 (테스트 준비 단계)

상세한 프로젝트 상태는 `PROJECT_STATUS.md` 참고:
- 완료된 작업 목록
- 다음 단계 (환경 설정 및 테스트)
- 알려진 이슈 및 제한사항

설치 및 설정 가이드는 `SETUP_GUIDE.md` 참고

## 아키텍처

```
┌─────────────────────────┐
│   Slack 사용자          │
└───────────┬─────────────┘
            │ Socket Mode
            ↓
┌─────────────────────────────────────┐
│  Bridge Server (Node.js/TypeScript) │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Slack Event Handler         │  │
│  │  - message.channels          │  │
│  │  - message.im                │  │
│  │  - app_mention               │  │
│  └───────────┬──────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │  Claude Session Manager      │  │
│  │  - User A → Claude Process 1 │  │
│  │  - User B → Claude Process 2 │  │
│  │  - Map<userId, IPty>         │  │
│  └───────────┬──────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │  Claude Code CLI (per user)  │  │
│  │  - PTY (node-pty)            │  │
│  │  - stream-json I/O           │  │
│  │  - --continue (세션 유지)     │  │
│  └───────────┬──────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │  Slack MCP Client            │  │
│  │  - JSON-RPC 2.0              │  │
│  │  - Bearer Token Auth         │  │
│  └───────────┬──────────────────┘  │
└──────────────┼──────────────────────┘
               ↓
    ┌──────────────────────┐
    │  Slack MCP Server    │
    │  (Docker Container)  │
    │  - conversations_*   │
    └──────────┬───────────┘
               ↓
    ┌──────────────────────┐
    │  Slack API           │
    └──────────────────────┘
```

### 주요 컴포넌트

1. **Bridge Server** (`src/index.ts` - 152줄)
   - Slack Bot (Socket Mode) 이벤트 수신
   - 메시지 및 앱 멘션 처리
   - 사용자별 세션 라우팅
   - Claude 응답을 Slack으로 전달
   - 에러 핸들링 및 로깅

2. **Claude Session Manager** (`src/claude-session-manager.ts` - 106줄)
   - 사용자별 Claude Code 프로세스 관리
   - PTY를 통한 stdin/stdout 제어
   - JSON 스트림 파싱 및 이벤트 발생
   - 세션 생명주기 관리 (생성/종료)
   - 버퍼링 및 라인 파싱

3. **Slack MCP Client** (`src/slack-mcp-client.ts` - 63줄)
   - Slack MCP Server와 JSON-RPC 2.0 통신
   - Bearer 토큰 인증
   - `conversations_add_message` 도구 호출
   - 마크다운 및 텍스트 포맷 지원

4. **Slack MCP Server** (Docker 컨테이너)
   - Slack API 추상화 레이어
   - MCP 프로토콜 제공
   - 메시지 전송, 채널 조회 등

## 주요 명령어

### 개발 환경

```bash
# 의존성 설치
npm install

# 개발 모드 (hot-reload)
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start

# 타입 체크
npx tsc --noEmit
```

### Docker Compose

```bash
# 전체 스택 시작
docker-compose up -d

# 로그 실시간 확인
docker-compose logs -f bridge-server
docker-compose logs -f slack-mcp-server

# 특정 서비스 재시작
docker-compose restart bridge-server

# 전체 중지 및 삭제
docker-compose down

# 볼륨까지 삭제 (주의!)
docker-compose down -v

# 재빌드
docker-compose build --no-cache
docker-compose up -d
```

### 개별 컴포넌트

```bash
# Slack MCP Server만 실행 (레거시)
docker-compose -f docker-compose-slack.yaml up -d

# Bridge Server만 빌드
docker build -t claude-slack-bridge .

# 컨테이너 접속
docker-compose exec bridge-server sh
```

### 디버깅

```bash
# Claude CLI 테스트
claude --version
claude --print "안녕하세요"

# 환경 변수 확인
cat .env | grep SLACK
docker-compose exec bridge-server env | grep SLACK

# 네트워크 확인
docker network ls
docker network inspect claude-slack-bridge_claude-slack-network

# 볼륨 확인
docker volume ls
docker volume inspect claude-slack-bridge_workspace-data
```

## 환경 설정

### 필수 환경 변수

`.env` 파일 생성 (`.env.example` 참고):

```bash
# Slack Bot 설정 (api.slack.com/apps)
SLACK_BOT_TOKEN=xoxb-your-bot-token          # OAuth & Permissions
SLACK_APP_TOKEN=xapp-your-app-token          # Socket Mode
SLACK_SIGNING_SECRET=your-signing-secret     # Basic Information

# Slack MCP Server
SLACK_MCP_XOXP_TOKEN=xoxp-your-user-token    # User OAuth Token
SLACK_MCP_SSE_API_KEY=your-secure-api-key    # 임의의 secure string
SLACK_MCP_ADD_MESSAGE_TOOL=your-channel-id   # 선택사항

# Anthropic API (console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-your-api-key

# 선택 사항
PORT=3000
WORKSPACE_DIR=/workspace
CLAUDE_PATH=claude
```

### Slack Bot 설정 (상세)

상세한 설정 가이드는 `SETUP_GUIDE.md` 참고

**요약**:
1. https://api.slack.com/apps 에서 앱 생성
2. **Socket Mode** 활성화 → `SLACK_APP_TOKEN` 획득
3. **Event Subscriptions** 활성화
   - `message.channels`, `message.im`, `app_mention`
4. **OAuth & Permissions**에서 Bot Token Scopes 추가
   - `app_mentions:read`, `chat:write`, `channels:history`, `groups:history`, `im:history`
5. Install to Workspace → `SLACK_BOT_TOKEN` 획득
6. **Basic Information**에서 `SLACK_SIGNING_SECRET` 획득

## 핵심 작동 원리

### 연속 세션 유지 메커니즘

Bridge Server가 각 Slack 사용자별로 독립적인 Claude Code 프로세스를 실행:

```typescript
// src/claude-session-manager.ts:21
const session = pty.spawn('claude', [
  '--output-format', 'stream-json',    // JSON 출력
  '--input-format', 'stream-json',     // JSON 입력
  '--dangerously-skip-permissions',    // 권한 확인 생략
  '--continue'                         // 대화 세션 유지 ⭐
], {
  cwd: this.workspaceDir,
  env: process.env
});
```

**핵심 플래그 설명**:
- `--continue`: 이전 대화 컨텍스트를 자동으로 이어감
- `--output-format stream-json`: 실시간 JSON 스트림으로 응답
- `--input-format stream-json`: JSON 메시지로 입력
- `--dangerously-skip-permissions`: 권한 확인 대화 생략 (자동화)

### 메시지 흐름 (상세)

```
1. Slack 사용자 → "지금 남은 작업 알려줘"
   ↓
2. Slack Events API (Socket Mode) → Bridge Server
   - event: message
   - user: U12345
   - text: "지금 남은 작업 알려줘"
   ↓
3. Bridge Server (src/index.ts:68)
   - claudeManager.sendMessage(channelId, text)
   ↓
4. Claude Session Manager (src/claude-session-manager.ts:87)
   - getOrCreateSession(userId) → PTY 프로세스
   - session.write(JSON.stringify({ type: 'user_message', content: text }))
   ↓
5. Claude Code CLI (stdin)
   - 메시지 수신 및 처리
   - 파일 읽기/쓰기, 명령 실행 등
   ↓
6. Claude Code CLI (stdout)
   - JSON 스트림 출력
   - { type: 'message', role: 'assistant', content: [...] }
   ↓
7. Claude Session Manager (src/claude-session-manager.ts:41)
   - handleOutput() → JSON 파싱
   - emit('message', userId, parsed)
   ↓
8. Bridge Server (src/index.ts:26)
   - Claude 응답 수신
   - slackMCP.sendClaudeResponse(channelId, content)
   ↓
9. Slack MCP Client (src/slack-mcp-client.ts:38)
   - JSON-RPC 2.0 요청 생성
   - POST http://slack-mcp-server:13080/mcp
   ↓
10. Slack MCP Server
   - conversations_add_message 도구 실행
   - Slack API 호출
   ↓
11. Slack → 사용자에게 응답 표시
```

### 세션 격리 및 관리

```typescript
// src/claude-session-manager.ts:9
private sessions: Map<string, pty.IPty> = new Map();

// 사용자별 독립 세션
User A (U12345) → Claude Process 1 (PID 1001)
User B (U67890) → Claude Process 2 (PID 1002)

// 장점:
// 1. 대화 컨텍스트 완벽 격리
// 2. 동시 다중 사용자 지원
// 3. 한 사용자의 에러가 다른 사용자에게 영향 없음
```

## 파일 구조

```
claude-slack-bridge/
├── src/
│   ├── index.ts                      # 메인 서버 (152줄)
│   │   - Slack Bot 설정
│   │   - 이벤트 핸들러
│   │   - Claude → Slack 응답 전달
│   │
│   ├── claude-session-manager.ts     # 세션 관리 (106줄)
│   │   - PTY 프로세스 관리
│   │   - JSON 스트림 파싱
│   │   - 이벤트 발생
│   │
│   └── slack-mcp-client.ts           # MCP 클라이언트 (63줄)
│       - JSON-RPC 2.0 통신
│       - Slack 메시지 전송
│
├── docker-compose.yaml               # 통합 스택
│   ├── bridge-server (Node.js)
│   └── slack-mcp-server (Go)
│
├── Dockerfile                        # Bridge 이미지
├── package.json                      # 의존성
├── tsconfig.json                     # TS 설정
├── .env.example                      # 환경 변수 템플릿
├── .gitignore
│
├── README.md                         # 사용자 가이드
├── CLAUDE.md                         # 이 파일
├── PROJECT_STATUS.md                 # 프로젝트 현황
└── SETUP_GUIDE.md                    # 설치 가이드
```

## 트러블슈팅

### Claude 세션이 시작되지 않음

**증상**: Slack 메시지에 응답 없음, 로그에 세션 생성 실패

**해결**:
```bash
# 1. API Key 확인
echo $ANTHROPIC_API_KEY
# 또는
cat .env | grep ANTHROPIC_API_KEY

# 2. Claude CLI 설치 확인
claude --version
# 없으면: npm install -g @anthropic-ai/claude-code

# 3. 로그 확인
docker-compose logs bridge-server | grep -i error

# 4. 권한 확인
docker-compose exec bridge-server which claude
```

### Slack 메시지를 받지 못함

**증상**: Slack에서 메시지 전송해도 Bridge Server 로그에 아무것도 없음

**해결**:
```bash
# 1. Socket Mode 확인
# https://api.slack.com/apps → Your App → Socket Mode
# Enable Socket Mode가 ON인지 확인

# 2. App Token 확인
cat .env | grep SLACK_APP_TOKEN
# xapp-로 시작하는지 확인

# 3. Bot이 채널에 있는지 확인
# Slack 채널에서 /invite @YourBot

# 4. Event Subscriptions 확인
# https://api.slack.com/apps → Your App → Event Subscriptions
# message.channels, message.im, app_mention 구독 확인

# 5. 서버 재시작
docker-compose restart bridge-server
docker-compose logs -f bridge-server
```

### 응답이 Slack으로 전송되지 않음

**증상**: Claude가 응답 생성했지만 Slack에 표시 안 됨

**해결**:
```bash
# 1. Slack MCP Server 상태 확인
docker-compose ps
# slack-mcp-server가 Up 상태인지 확인

# 2. API 키 일치 확인
cat .env | grep SLACK_MCP_SSE_API_KEY
# Bridge와 MCP Server의 키가 동일한지 확인

# 3. 네트워크 연결 확인
docker network inspect claude-slack-bridge_claude-slack-network
# bridge-server와 slack-mcp-server가 같은 네트워크에 있는지

# 4. MCP Server 로그 확인
docker-compose logs slack-mcp-server

# 5. 수동 테스트
curl -X POST http://localhost:13080/mcp \
  -H "Authorization: Bearer ${SLACK_MCP_SSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/call","params":{"name":"channels_list","arguments":{}}}'
```

### JSON 파싱 오류

**증상**: 로그에 "비JSON 출력" 메시지

**원인**: Claude CLI 출력 형식 변경 또는 디버그 메시지

**해결**:
```bash
# 1. Claude CLI 버전 확인
claude --version

# 2. 로그 상세 확인
docker-compose logs bridge-server | grep "비JSON"

# 3. 수동 테스트
echo '{"type":"user_message","content":"안녕"}' | \
  claude --input-format stream-json --output-format stream-json --print

# 4. 버퍼 문제일 수 있음 - 재시작
docker-compose restart bridge-server
```

### 세션이 멈춤 / 응답 없음

**증상**: 이전엔 작동했는데 갑자기 응답 없음

**해결**:
```bash
# 1. 활성 세션 확인
docker-compose exec bridge-server ps aux | grep claude

# 2. 좀비 프로세스 정리
docker-compose restart bridge-server

# 3. 메모리 확인
docker stats bridge-server

# 4. 볼륨 정리 (주의: 대화 히스토리 삭제됨)
docker-compose down
docker volume rm claude-slack-bridge_claude-config
docker-compose up -d
```

## 보안 고려사항

### 필수 조치

1. **`.env` 파일 보호**
   ```bash
   # .gitignore에 추가 (이미 되어있음)
   chmod 600 .env
   ```

2. **토큰 주기적 갱신**
   - Slack Token: 90일마다 갱신 권장
   - Anthropic API Key: 노출 시 즉시 재발급

3. **`--dangerously-skip-permissions` 주의**
   - 신뢰할 수 있는 환경에서만 사용
   - 프로덕션에선 권한 확인 메커니즘 추가 고려

4. **Docker 볼륨 암호화**
   ```bash
   # 민감한 파일이 볼륨에 저장될 경우
   # 암호화된 볼륨 사용 또는 주기적 정리
   ```

5. **네트워크 격리**
   ```yaml
   # docker-compose.yaml
   # bridge 네트워크로 외부 접근 차단 (이미 설정됨)
   ```

### 권장 사항

- Slack 워크스페이스를 private으로 설정
- Bot을 필요한 채널에만 초대
- 로그에 민감한 정보 노출 주의
- 정기적인 보안 업데이트

## 확장 가능성

### 구현 가능한 기능

1. **세션 타임아웃** (난이도: ⭐)
   ```typescript
   // claude-session-manager.ts에 추가
   private sessionTimeouts: Map<string, NodeJS.Timeout>
   // 30분 비활성 시 자동 종료
   ```

2. **대화 히스토리 저장** (난이도: ⭐⭐)
   ```typescript
   // PostgreSQL 또는 MongoDB에 저장
   // 세션 재개 시 히스토리 복원
   ```

3. **실시간 타이핑 표시** (난이도: ⭐⭐)
   ```typescript
   // Claude 응답 스트리밍
   // Slack "typing..." 인디케이터 표시
   ```

4. **Slash Commands** (난이도: ⭐)
   ```typescript
   // /claude reset - 세션 초기화
   // /claude status - 현재 상태 확인
   ```

5. **멀티 워크스페이스** (난이도: ⭐⭐⭐)
   ```typescript
   // 사용자별 독립 디렉토리
   // Git 저장소 자동 클론
   ```

6. **모니터링 & 알림** (난이도: ⭐⭐)
   ```typescript
   // Prometheus 메트릭
   // 에러 시 관리자에게 알림
   ```

## 다음 단계

1. **환경 설정**: `SETUP_GUIDE.md` 참고
2. **테스트**: Slack에서 간단한 대화 테스트
3. **모니터링**: 로그 확인 및 안정성 검증
4. **최적화**: 필요 시 성능 개선

## 참고 자료

- **Slack API**: https://api.slack.com/
- **Slack Bolt**: https://slack.dev/bolt-js/
- **Claude Code**: https://docs.claude.com/en/docs/claude-code/
- **Slack MCP Server**: https://github.com/korotovsky/slack-mcp-server
- **node-pty**: https://github.com/microsoft/node-pty
- **MCP Protocol**: https://modelcontextprotocol.io/

---

**새 세션에서 작업 시작**:
1. `PROJECT_STATUS.md` 읽기 - 현재 진행 상황 파악
2. `SETUP_GUIDE.md` 따라하기 - 환경 설정 및 테스트
3. 이 파일 (`CLAUDE.md`) - 기술 참고
