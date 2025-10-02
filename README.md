# Claude-Slack Bridge

Slack에서 Claude Code CLI와 실시간으로 대화할 수 있는 브리지 시스템입니다. Slack 채널이나 DM에서 Claude에게 메시지를 보내면, Claude가 실제 파일 시스템에 접근하여 코드를 읽고, 수정하고, 명령을 실행할 수 있습니다.

## 주요 기능

- **실시간 대화**: Slack에서 Claude Code와 즉시 대화
- **세션 유지**: 이전 대화 내용을 기억하는 연속적인 대화 세션
- **파일 시스템 접근**: Claude가 실제 프로젝트 파일을 읽고 수정
- **채널 및 DM 지원**: 공개/비공개 채널, 1대1 DM 모두 지원
- **스트리밍 응답**: Claude의 실시간 작업 진행 상황 표시
- **진행 상황 알림**: 긴 작업 시 30초마다 대기 상황 업데이트
- **유연한 세션 제어**: `-clear` 접두사로 새 세션 시작 가능
- **사용자 액세스 제어**: 허용된 사용자/채널만 봇 사용 가능

## 작동 방식

```
사용자 (Slack) → Bridge Server → Claude Code CLI → 응답
                     ↓
                Workspace 파일 시스템
```

1. Slack에서 `@Claude` 멘션으로 메시지 전송
2. Bridge Server가 메시지를 수신하여 Claude CLI로 전달
3. Claude가 워크스페이스에서 파일 읽기/쓰기, 명령 실행
4. Claude의 응답을 Slack으로 다시 전송
5. 대화 컨텍스트가 유지되어 연속적인 대화 가능

## 설치

### 필수 요구사항

- **Node.js**: 18 이상
- **Claude Code CLI**: 유료 구독 필요
- **Slack 워크스페이스**: Bot 생성 권한 필요

### 1. Claude Code CLI 설치

```bash
npm install -g @anthropic-ai/claude-code

# 설치 확인
claude --version

# 로그인 (OAuth 인증)
claude login
```

### 2. 프로젝트 클론 및 설치

```bash
git clone https://github.com/yourusername/claude-slack-bridge.git
cd claude-slack-bridge

# 의존성 설치
npm install

# 빌드
npm run build
```

### 3. Slack Bot 생성 및 설정

#### 3.1. Slack 앱 생성

1. https://api.slack.com/apps 접속
2. **Create New App** 클릭
3. **From scratch** 선택
4. App Name과 Workspace 선택 후 생성

#### 3.2. Socket Mode 활성화

1. 좌측 메뉴에서 **Socket Mode** 선택
2. **Enable Socket Mode** 토글 ON
3. **Token Name** 입력 (예: `claude-bridge-token`)
4. **Generate** 클릭
5. 생성된 토큰 복사 (`xapp-`로 시작) → 이것이 `SLACK_APP_TOKEN`

#### 3.3. Bot Token Scopes 설정

1. 좌측 메뉴에서 **OAuth & Permissions** 선택
2. **Scopes** → **Bot Token Scopes** 섹션에서 다음 권한 추가:
   - `app_mentions:read` - 멘션 읽기
   - `chat:write` - 메시지 전송
   - `channels:history` - 공개 채널 메시지 읽기
   - `groups:history` - 비공개 채널 메시지 읽기
   - `im:history` - DM 메시지 읽기
   - `mpim:history` - 그룹 DM 메시지 읽기

#### 3.4. Event Subscriptions 설정

1. 좌측 메뉴에서 **Event Subscriptions** 선택
2. **Enable Events** 토글 ON
3. **Subscribe to bot events** 섹션에서 다음 이벤트 추가:
   - `app_mention` - 멘션 감지
   - `message.channels` - 공개 채널 메시지
   - `message.groups` - 비공개 채널 메시지
   - `message.im` - DM 메시지
   - `message.mpim` - 그룹 DM 메시지
4. **Save Changes** 클릭

#### 3.5. 앱 설치 및 토큰 획득

1. 좌측 메뉴에서 **Install App** 선택
2. **Install to Workspace** 클릭
3. 권한 승인
4. **Bot User OAuth Token** 복사 (`xoxb-`로 시작) → 이것이 `SLACK_BOT_TOKEN`

#### 3.6. Bot User ID 및 Signing Secret 확인

1. 좌측 메뉴에서 **Basic Information** 선택
2. **App Credentials** 섹션에서 **Signing Secret** 복사 → 이것이 `SLACK_SIGNING_SECRET`
3. Slack 워크스페이스에서 봇을 채널에 추가한 후, 봇 프로필 클릭
4. URL에서 User ID 확인 (예: `U09J01W1PCN`) → 이것이 `BOT_USER_ID`

또는 다음 명령으로 Bot User ID 확인:

```bash
curl -H "Authorization: Bearer YOUR_SLACK_BOT_TOKEN" \
  https://slack.com/api/auth.test
```

### 4. 환경 변수 설정

`.env` 파일 생성:

```bash
# Slack Bot 설정
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret
BOT_USER_ID=U09J01W1PCN

# 허용된 사용자 ID 목록 (필수, 쉼표로 구분)
# 사용자 ID 또는 DM 채널 ID 사용 가능
ALLOWED_USER_IDS=U12345ABC,D67890XYZ

# Workspace 설정
WORKSPACE_DIR=/path/to/your/workspace
```

## 실행

### 개발 모드

```bash
npm run dev
```

### 프로덕션 모드

```bash
npm start
```

### 백그라운드 실행

```bash
nohup npm start > bridge.log 2>&1 &
```

## 사용 방법

### 채널에서 대화

1. Slack 채널에 봇을 초대: `/invite @YourBot`
2. 메시지 전송:
   ```
   @Claude 현재 프로젝트 구조 확인해줘
   ```

### DM에서 대화

1. 봇과 DM 시작
2. 멘션 없이 메시지 전송:
   ```
   현재 작업 상황 알려줘
   ```

### 세션 제어

**기본 동작** (세션 유지):
```
@Claude 내 이름은 철수야
@Claude 내 이름 뭐였지?
→ "철수라고 하셨습니다" (기억함)
```

**새 세션 시작** (`-clear` 접두사):
```
@Claude -clear 내 이름은 영수야
@Claude 내 이름 뭐였지?
→ "영수라고 하셨습니다" (새로운 컨텍스트)
```

### 실시간 진행 상황

Claude가 작업을 수행하면 실시간으로 Slack에 표시됩니다:

```
🔵 세션 시작
• 세션 ID: a1b2c3d4...
• 모델: claude-sonnet-4
• 작업 디렉토리: /workspace

🔧 도구 사용: Read
입력: {"file_path": "/workspace/package.json"}

package.json 파일을 확인했습니다...
```

### 긴 작업 처리

Claude가 복잡한 작업을 수행할 때:
- 30초마다 "⏳ Claude 응답 대기중... (30초 경과)" 메시지 표시
- 최대 1시간까지 대기
- 새 메시지를 보내면 이전 작업을 중단하고 새 작업 시작

## 아키텍처

```
claude-slack-bridge/
├── src/
│   ├── index.ts                    # Slack Bot 메인 서버
│   ├── claude-session-manager.ts   # Claude CLI 프로세스 관리
│   └── slack-mcp-client.ts         # (사용 안함)
├── dist/                           # 빌드 결과물
├── .env                            # 환경 변수
├── package.json
├── tsconfig.json
└── README.md
```

### 핵심 컴포넌트

**index.ts** - Slack Bot 서버
- Slack Socket Mode 이벤트 수신
- `app_mention` (채널 멘션) 및 `message.im` (DM) 처리
- Claude 응답을 Slack으로 전달

**claude-session-manager.ts** - 세션 관리자
- 사용자별 Claude CLI 프로세스 실행
- `claude -p -c --permission-mode bypassPermissions --verbose --output-format stream-json` 명령 사용
- 실시간 JSON 스트리밍 파싱
- 세션 초기화, 도구 사용, 텍스트 응답 이벤트 발생
- 타임아웃 및 대기 메시지 관리

## 문제 해결

### Bot이 메시지를 받지 못함

**원인**: Socket Mode 또는 Event Subscriptions 미설정

**해결**:
1. https://api.slack.com/apps → Your App
2. **Socket Mode** ON 확인
3. **Event Subscriptions** → 필요한 이벤트 구독 확인
4. 앱 재설치: **Install App** → **Reinstall to Workspace**

### "Invalid API key" 에러

**원인**: Claude CLI 인증 실패

**해결**:
```bash
# 재로그인
claude login

# 인증 확인
echo "1+1?" | claude -p
```

### DM이 작동하지 않음

**원인**: DM 권한 미설정

**해결**:
1. **OAuth & Permissions** → `im:history` 권한 추가
2. **Event Subscriptions** → `message.im` 이벤트 추가
3. 앱 재설치

### 메시지가 두 번 전송됨

**원인**: `app_mention`과 `app.message` 핸들러 충돌

**해결**: 이미 코드에서 해결됨 (채널은 `app_mention`만, DM은 `app.message`만 처리)

## 보안 고려사항

- `.env` 파일을 절대 커밋하지 마세요
- `SLACK_BOT_TOKEN`과 `SLACK_APP_TOKEN`을 안전하게 보관하세요
- `--permission-mode bypassPermissions` 플래그는 신뢰할 수 있는 환경에서만 사용하세요
- 프로덕션 환경에서는 워크스페이스 디렉토리 접근을 제한하세요
- **`ALLOWED_USER_IDS`를 반드시 설정**하여 허용된 사용자만 봇에 접근하도록 제한하세요
  - 사용자 ID (예: `U12345ABC`) 또는 DM 채널 ID (예: `D67890XYZ`) 사용 가능
  - 여러 사용자 허용 시 쉼표로 구분: `ALLOWED_USER_IDS=U12345,D67890,U11111`

## 라이선스

MIT

## 기여

Pull Request를 환영합니다!

## 문의

이슈가 있으면 GitHub Issues에 등록해주세요.
