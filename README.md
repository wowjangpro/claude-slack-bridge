# Claude Slack Bridge (GUI Version)

Slack과 Claude Code CLI를 연결하는 Electron 데스크톱 애플리케이션입니다. Slack에서 Claude와 실시간으로 대화하고, Claude가 실제 파일 시스템에 접근하여 작업을 수행할 수 있습니다.

![Claude Slack Bridge](build/icon.png)

## 주요 기능

- **Electron GUI**: 사용자 친화적인 데스크톱 애플리케이션
- **실시간 로그 모니터링**: 모든 메시지와 작업을 실시간으로 확인
- **설정 마법사**: 처음 실행 시 단계별 설정 가이드
- **연결 상태 표시**: Slack Bot 연결 상태를 실시간으로 확인
- **세션 유지**: 이전 대화 내용을 기억하는 연속적인 대화
- **파일 시스템 접근**: Claude가 실제 프로젝트 파일을 읽고 수정
- **채널 및 DM 지원**: 공개/비공개 채널, 1대1 DM 모두 지원
- **안전한 설정 저장**: 암호화된 로컬 저장소에 설정 보관

## 스크린샷

### 메인 화면
실시간 로그를 모니터링하고 연결 상태를 확인할 수 있습니다.

### 설정 화면
Slack Bot 토큰, 워크스페이스 경로 등을 설정할 수 있습니다.

### 시작 마법사
처음 실행 시 단계별로 설정을 안내합니다.

## 설치

### 필수 요구사항

- **macOS**: 10.12 이상 (현재 macOS만 지원)
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

### 2. 앱 다운로드

#### 직접 빌드하기

```bash
git clone https://github.com/wowjangpro/claude-slack-bridge.git
cd claude-slack-bridge
git checkout gui-version

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 또는 프로덕션 빌드
npm run build:electron
```

빌드 완료 후 `release/` 폴더에서 설치 파일을 찾을 수 있습니다:
- `Claude Slack Bridge-x.x.x-arm64.dmg` - DMG 설치 파일
- `Claude Slack Bridge-x.x.x-arm64-mac.zip` - ZIP 압축 파일

### 3. Slack Bot 설정

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
5. 생성된 토큰 복사 (`xapp-`로 시작) → **Slack App Token**

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
4. **Bot User OAuth Token** 복사 (`xoxb-`로 시작) → **Slack Bot Token**

#### 3.6. Bot User ID 및 Signing Secret 확인

1. 좌측 메뉴에서 **Basic Information** 선택
2. **App Credentials** 섹션에서 **Signing Secret** 복사
3. Slack 워크스페이스에서 봇 프로필 클릭 → URL에서 User ID 확인 (예: `U09J01W1PCN`)

또는 다음 명령으로 Bot User ID 확인:

```bash
curl -H "Authorization: Bearer YOUR_SLACK_BOT_TOKEN" \
  https://slack.com/api/auth.test
```

## 사용 방법

### 첫 실행

1. 앱을 실행하면 **설정 마법사**가 자동으로 시작됩니다
2. 단계별로 다음 정보를 입력:
   - Slack Bot Token (`xoxb-...`)
   - Slack App Token (`xapp-...`)
   - Slack Signing Secret
   - Bot User ID
   - 작업 디렉토리 경로
   - Claude CLI 경로 (선택사항)
   - 허용된 사용자 ID 목록
3. **완료** 버튼을 클릭하면 자동으로 연결됩니다

### 메인 화면

- **연결 상태**: 우측 상단에서 현재 연결 상태 확인
- **재연결**: 연결이 끊어진 경우 재연결 버튼 클릭
- **설정**: 언제든지 설정을 변경할 수 있습니다
- **로그 지우기**: 화면에 표시된 로그를 지웁니다
- **실시간 로그**: 모든 메시지와 Claude의 작업 내역을 실시간으로 확인

### Slack에서 대화하기

#### 채널에서 사용

1. Slack 채널에 봇을 초대: `/invite @YourBot`
2. 멘션으로 메시지 전송:
   ```
   @Claude 현재 프로젝트 구조 확인해줘
   ```

#### DM에서 사용

1. 봇과 DM 시작
2. 멘션 없이 메시지 전송:
   ```
   현재 작업 상황 알려줘
   ```

#### 세션 제어

기본적으로 대화 내용이 계속 유지됩니다:
```
@Claude 내 이름은 철수야
@Claude 내 이름 뭐였지?
→ "철수라고 하셨습니다" (기억함)
```

새로운 세션을 시작하려면 `-clear` 접두사 사용:
```
@Claude -clear 내 이름은 영수야
@Claude 내 이름 뭐였지?
→ "영수라고 하셨습니다" (새로운 컨텍스트)
```

## 프로젝트 구조

```
claude-slack-bridge/
├── electron-src/
│   ├── main/                      # Electron 메인 프로세스
│   │   ├── index.ts              # 앱 진입점
│   │   ├── config-manager.ts     # 설정 관리 (electron-store)
│   │   ├── bridge-manager.ts     # Slack Bot 관리
│   │   ├── claude-session-manager.ts  # Claude CLI 프로세스 관리
│   │   └── ipc-handlers.ts       # IPC 통신 핸들러
│   ├── preload/                  # 프리로드 스크립트
│   │   └── index.ts              # IPC 브릿지
│   ├── renderer/                 # React UI
│   │   ├── pages/                # 페이지 컴포넌트
│   │   │   ├── Main.tsx          # 메인 화면
│   │   │   ├── Settings.tsx      # 설정 화면
│   │   │   └── SetupWizard.tsx   # 시작 마법사
│   │   ├── components/           # 재사용 컴포넌트
│   │   │   ├── ConnectionStatus.tsx
│   │   │   ├── MessageLog.tsx
│   │   │   └── Statistics.tsx
│   │   ├── store.ts              # Zustand 상태 관리
│   │   └── App.tsx               # 라우터 설정
│   └── shared/
│       └── types.ts              # 공유 타입 정의
├── build/                        # 앱 리소스
│   ├── icon.png                  # 앱 아이콘
│   └── icon.svg                  # 아이콘 소스
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
└── vite.config.ts
```

## 기술 스택

- **Electron**: 26.x - 크로스 플랫폼 데스크톱 앱
- **React**: 18.x - UI 프레임워크
- **TypeScript**: 5.x - 타입 안전성
- **Ant Design**: 5.x - UI 컴포넌트 라이브러리
- **Zustand**: 4.x - 상태 관리
- **Vite**: 5.x - 빌드 도구
- **electron-store**: 8.x - 암호화된 설정 저장
- **@slack/bolt**: 4.x - Slack Bot SDK

## 문제 해결

### 앱이 시작되지 않음

**해결**:
```bash
# 설정 파일 삭제
rm ~/Library/Application\ Support/claude-slack-bridge-gui/claude-slack-bridge-config.json

# 앱 재시작
```

### Bot이 메시지를 받지 못함

**확인 사항**:
1. Socket Mode가 활성화되어 있는지
2. Event Subscriptions에 필요한 이벤트가 추가되어 있는지
3. Bot이 채널에 초대되어 있는지

### "Invalid API key" 에러

**해결**:
```bash
# Claude CLI 재로그인
claude login

# 인증 확인
echo "1+1?" | claude -p
```

### 로그가 중복으로 표시됨

이 문제는 수정되었습니다. 최신 버전으로 업데이트하세요.

## 개발

### 개발 모드 실행

```bash
# Renderer 개발 서버 시작
npm run dev

# 별도 터미널에서 Electron 실행
npm run dev:electron
```

### 빌드

```bash
# 프로덕션 빌드
npm run build:electron
```

빌드된 파일은 `release/` 폴더에 생성됩니다.

## 보안

- 모든 토큰과 설정은 암호화되어 로컬에 저장됩니다
- `.env` 파일은 사용하지 않습니다 (GUI 설정으로 대체)
- `ALLOWED_USER_IDS` 설정으로 접근 제어
- Slack API는 공식 SDK를 사용하여 안전하게 통신

## 라이선스

MIT

## 기여

Pull Request를 환영합니다!

## 관련 링크

- [Slack API 문서](https://api.slack.com/)
- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code/)
- [Electron 문서](https://www.electronjs.org/)

## 문의

이슈가 있으면 GitHub Issues에 등록해주세요.
