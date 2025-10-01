# 설치 및 설정 가이드

다른 세션에서 이 프로젝트를 계속 진행하기 위한 단계별 가이드입니다.

## 📋 체크리스트

### Phase 1: Slack Bot 설정 (약 10분)
- [ ] Slack App 생성
- [ ] Socket Mode 활성화
- [ ] Event Subscriptions 설정
- [ ] OAuth Permissions 설정
- [ ] 토큰 복사 (3개)

### Phase 2: 환경 변수 설정 (약 5분)
- [ ] `.env` 파일 생성
- [ ] 모든 토큰 입력
- [ ] Anthropic API Key 발급

### Phase 3: 로컬 테스트 (약 10분)
- [ ] 의존성 설치
- [ ] 개발 모드 실행
- [ ] Slack에서 테스트

### Phase 4: Docker 배포 (약 5분)
- [ ] Docker Compose 빌드
- [ ] 컨테이너 실행
- [ ] 로그 확인

---

## Phase 1: Slack Bot 설정 (상세)

### 1.1 Slack App 생성

1. https://api.slack.com/apps 접속
2. **"Create New App"** 클릭
3. **"From scratch"** 선택
4. App Name: `Claude Bridge` (또는 원하는 이름)
5. Workspace 선택
6. **"Create App"** 클릭

### 1.2 Socket Mode 활성화

1. 왼쪽 메뉴에서 **"Socket Mode"** 클릭
2. **"Enable Socket Mode"** 토글 ON
3. Token Name: `claude-bridge-socket`
4. **"Generate"** 클릭
5. ⚠️ **토큰 복사** → `SLACK_APP_TOKEN=xapp-...`
6. **"Done"** 클릭

### 1.3 Event Subscriptions 설정

1. 왼쪽 메뉴에서 **"Event Subscriptions"** 클릭
2. **"Enable Events"** 토글 ON
3. **"Subscribe to bot events"** 섹션에서 다음 추가:
   - `app_mention` - 봇 멘션 감지
   - `message.channels` - 채널 메시지 수신
   - `message.im` - DM 메시지 수신
   - `message.groups` - 비공개 채널 메시지 수신
4. **"Save Changes"** 클릭

### 1.4 OAuth & Permissions 설정

1. 왼쪽 메뉴에서 **"OAuth & Permissions"** 클릭
2. **"Scopes"** → **"Bot Token Scopes"** 섹션에서 다음 추가:
   - `app_mentions:read` - 멘션 읽기
   - `chat:write` - 메시지 전송
   - `channels:history` - 채널 히스토리 읽기
   - `groups:history` - 비공개 채널 히스토리
   - `im:history` - DM 히스토리
3. 페이지 상단 **"Install to Workspace"** 클릭
4. **"Allow"** 클릭
5. ⚠️ **Bot User OAuth Token 복사** → `SLACK_BOT_TOKEN=xoxb-...`

### 1.5 Signing Secret 복사

1. 왼쪽 메뉴에서 **"Basic Information"** 클릭
2. **"App Credentials"** 섹션에서 **"Signing Secret"** 찾기
3. **"Show"** 클릭
4. ⚠️ **시크릿 복사** → `SLACK_SIGNING_SECRET=...`

### 1.6 User Token 생성 (Slack MCP Server용)

1. 왼쪽 메뉴에서 **"OAuth & Permissions"** 클릭
2. **"User Token Scopes"** 섹션에서 다음 추가:
   - `channels:read`
   - `channels:write`
   - `chat:write`
3. **"Reinstall to Workspace"** 클릭
4. **"Allow"** 클릭
5. ⚠️ **User OAuth Token 복사** → `SLACK_MCP_XOXP_TOKEN=xoxp-...`

---

## Phase 2: 환경 변수 설정

### 2.1 .env 파일 생성

```bash
cd /Users/jeniel/Works/claude-slack-bridge
cp .env.example .env
```

### 2.2 .env 파일 편집

```bash
# 에디터로 열기
code .env  # 또는 vim .env
```

### 2.3 토큰 입력

```bash
# Phase 1에서 복사한 토큰들
SLACK_BOT_TOKEN=xoxb-YOUR-BOT-TOKEN
SLACK_APP_TOKEN=xapp-YOUR-APP-TOKEN
SLACK_SIGNING_SECRET=YOUR-SIGNING-SECRET

# Phase 1.6에서 복사한 User Token
SLACK_MCP_XOXP_TOKEN=xoxp-YOUR-USER-TOKEN

# MCP API Key (임의의 secure string)
SLACK_MCP_SSE_API_KEY=claude-bridge-secret-key-2025

# 메시지를 받을 채널 ID (선택사항)
SLACK_MCP_ADD_MESSAGE_TOOL=C01234567890

# Anthropic API Key (https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-YOUR-API-KEY
```

### 2.4 Anthropic API Key 발급

1. https://console.anthropic.com/ 접속
2. 계정 생성 또는 로그인
3. **"API Keys"** 메뉴
4. **"Create Key"** 클릭
5. 이름: `claude-slack-bridge`
6. ⚠️ **키 복사** → `ANTHROPIC_API_KEY=sk-ant-...`

---

## Phase 3: 로컬 테스트

### 3.1 의존성 설치

```bash
cd /Users/jeniel/Works/claude-slack-bridge
npm install
```

### 3.2 Slack MCP Server 시작 (별도 터미널)

```bash
docker-compose up slack-mcp-server
```

확인:
```
✓ slack-mcp-server listening on port 13080
```

### 3.3 Bridge Server 개발 모드 실행

```bash
npm run dev
```

확인:
```
⚡️ Claude-Slack Bridge 서버가 실행 중입니다!
활성 세션: 0
```

### 3.4 Slack에서 테스트

1. Slack Workspace에서 봇 찾기
2. 봇에게 DM 전송: `안녕하세요`
3. 또는 채널에서 멘션: `@Claude Bridge 안녕하세요`

**예상 응답**:
- Bridge Server 로그에 메시지 수신 확인
- Claude Code 세션 시작
- Slack으로 응답 전송

### 3.5 트러블슈팅 (로컬)

**봇이 응답하지 않음**:
```bash
# 로그 확인
# Bridge Server 로그에서 에러 확인
# 환경 변수 재확인
cat .env | grep SLACK
```

**Claude 세션 오류**:
```bash
# Claude CLI 설치 확인
claude --version

# API Key 확인
echo $ANTHROPIC_API_KEY
```

---

## Phase 4: Docker 배포

### 4.1 Docker Compose 빌드

```bash
cd /Users/jeniel/Works/claude-slack-bridge
docker-compose build
```

### 4.2 전체 스택 실행

```bash
docker-compose up -d
```

### 4.3 상태 확인

```bash
# 컨테이너 상태
docker-compose ps

# 로그 확인
docker-compose logs -f bridge-server
docker-compose logs -f slack-mcp-server
```

**정상 출력**:
```
bridge-server      | ⚡️ Claude-Slack Bridge 서버가 실행 중입니다!
slack-mcp-server   | listening on port 13080
```

### 4.4 Slack에서 최종 테스트

```
사용자: @Claude Bridge 지금 시간 알려줘
Claude: [현재 시간 응답]

사용자: 고마워
Claude: [감사 인사 응답]
```

### 4.5 트러블슈팅 (Docker)

**컨테이너가 시작되지 않음**:
```bash
docker-compose logs bridge-server
# 환경 변수 누락 확인
```

**네트워크 오류**:
```bash
docker network ls
docker network inspect claude-slack-bridge_claude-slack-network
```

**볼륨 문제**:
```bash
docker volume ls
docker-compose down -v  # 볼륨 삭제 (주의!)
docker-compose up -d
```

---

## 📝 다음 세션 체크리스트

다음에 이 프로젝트를 계속할 때:

1. ✅ `PROJECT_STATUS.md` 읽기 - 현재 상태 파악
2. ✅ `SETUP_GUIDE.md` (이 파일) - 설정 확인
3. ✅ 서비스 상태 확인:
   ```bash
   docker-compose ps
   docker-compose logs -f bridge-server
   ```
4. ✅ Slack에서 간단한 테스트 메시지 전송
5. ✅ `PROJECT_STATUS.md`의 "다음 단계" 섹션 진행

---

## 🔧 유용한 명령어 모음

### 개발 중
```bash
# 로그 실시간 확인
npm run dev | tee dev.log

# 타입 체크
npx tsc --noEmit

# 빌드
npm run build
```

### Docker
```bash
# 재시작
docker-compose restart bridge-server

# 특정 서비스 로그
docker-compose logs -f bridge-server --tail=100

# 컨테이너 접속
docker-compose exec bridge-server sh

# 전체 재빌드
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 디버깅
```bash
# Claude CLI 테스트
claude --print "안녕하세요"

# Slack MCP 연결 테스트
curl -H "Authorization: Bearer ${SLACK_MCP_SSE_API_KEY}" \
     http://localhost:13080/health

# 환경 변수 확인
docker-compose exec bridge-server env | grep SLACK
```

---

## ✅ 완료!

모든 설정이 완료되었습니다. Slack에서 Claude와 대화를 시작하세요! 🎉
