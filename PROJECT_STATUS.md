# 프로젝트 상태 - Claude-Slack Bridge

## 📅 마지막 업데이트
2025-10-01

## 🎯 프로젝트 목표

Slack과 Claude Code 간 양방향 실시간 대화 시스템 구축
- Slack에서 Claude Code에게 명령 전송
- Claude Code가 연속 세션을 유지하며 응답
- 사용자별 독립적인 대화 컨텍스트 관리

## ✅ 완료된 작업

### 1. 아키텍처 설계 ✅
- **핵심 아키텍처 결정**: PTY + stream-json 방식으로 Claude Code CLI 제어
- **연속 세션 방식**: `claude --continue --output-format stream-json` 사용
- **멀티 유저 지원**: 사용자별 독립 Claude 프로세스 관리

### 2. 브리지 서버 구현 ✅
**파일**: `src/index.ts`
- Slack Bot (Socket Mode) 이벤트 수신
- 메시지 및 앱 멘션 처리
- Claude 응답을 Slack으로 전달

### 3. Claude 세션 관리자 구현 ✅
**파일**: `src/claude-session-manager.ts`
- 사용자별 Claude Code 프로세스 생성 및 관리
- PTY를 통한 stdin/stdout 제어
- JSON 스트림 파싱 및 이벤트 발생
- 세션 종료 처리

### 4. Slack MCP 클라이언트 구현 ✅
**파일**: `src/slack-mcp-client.ts`
- Slack MCP Server와 통신
- MCP 프로토콜로 메시지 전송
- Claude 응답을 Slack으로 전송

### 5. Docker 환경 구성 ✅
**파일**:
- `Dockerfile`: Bridge Server 이미지
- `docker-compose.yaml`: 전체 스택 (Bridge + Slack MCP Server)
- `docker-compose-slack.yaml`: 레거시 (Slack MCP Server만)

### 6. 프로젝트 설정 ✅
**파일**:
- `package.json`: Node.js 의존성 및 스크립트
- `tsconfig.json`: TypeScript 설정
- `.env.example`: 환경 변수 템플릿
- `.gitignore`: Git 무시 파일

### 7. 문서화 ✅
**파일**:
- `README.md`: 사용자 가이드 (설치, 설정, 사용법)
- `CLAUDE.md`: 개발자 가이드 (아키텍처, 명령어, 트러블슈팅)

## 📋 다음 단계 (미완료)

### 1. 환경 설정 및 테스트 🔜
- [ ] `.env` 파일 생성 및 토큰 입력
  - Slack Bot Token (`SLACK_BOT_TOKEN`)
  - Slack App Token (`SLACK_APP_TOKEN`)
  - Slack Signing Secret (`SLACK_SIGNING_SECRET`)
  - Slack User Token (`SLACK_MCP_XOXP_TOKEN`)
  - Slack MCP API Key (`SLACK_MCP_SSE_API_KEY`)
  - Anthropic API Key (`ANTHROPIC_API_KEY`)

### 2. Slack Bot 설정 🔜
- [ ] https://api.slack.com/apps 에서 Slack App 생성
- [ ] Socket Mode 활성화
- [ ] Event Subscriptions 설정:
  - `message.channels`
  - `message.im`
  - `app_mention`
- [ ] OAuth Permissions 추가:
  - `app_mentions:read`
  - `chat:write`
  - `channels:history`
  - `groups:history`
  - `im:history`
- [ ] Bot을 테스트 채널에 초대

### 3. 로컬 테스트 🔜
```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 테스트 메시지 전송
# Slack에서 봇에게 "안녕" 전송 후 응답 확인
```

### 4. Docker 테스트 🔜
```bash
# 이미지 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f bridge-server

# 테스트 후 중지
docker-compose down
```

### 5. 개선 사항 (선택) 🔮
- [ ] 세션 타임아웃 구현 (일정 시간 비활성 시 자동 종료)
- [ ] 대화 히스토리 영구 저장 (데이터베이스)
- [ ] Claude 응답 스트리밍 (실시간 타이핑 표시)
- [ ] Slack Slash Commands 지원 (`/claude reset` 등)
- [ ] 멀티 워크스페이스 지원 (사용자별 독립 디렉토리)
- [ ] 에러 핸들링 강화
- [ ] 로깅 시스템 개선
- [ ] 모니터링 및 헬스체크
- [ ] 단위 테스트 작성

## 🏗️ 아키텍처 요약

```
┌─────────────────────────┐
│   Slack 사용자          │
└───────────┬─────────────┘
            │ Socket Mode / Events API
            ↓
┌─────────────────────────────────────┐
│  Bridge Server (Node.js/TypeScript) │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Slack Event Handler         │  │
│  └───────────┬──────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │  Claude Session Manager      │  │
│  │  - User A → Claude Process 1 │  │
│  │  - User B → Claude Process 2 │  │
│  └───────────┬──────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │  Claude Code CLI             │  │
│  │  (PTY + stream-json)         │  │
│  └───────────┬──────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │  Slack MCP Client            │  │
│  └───────────┬──────────────────┘  │
└──────────────┼──────────────────────┘
               ↓
    ┌──────────────────────┐
    │  Slack MCP Server    │
    │  (Docker Container)  │
    └──────────┬───────────┘
               ↓
    ┌──────────────────────┐
    │  Slack API           │
    └──────────────────────┘
```

## 🔑 핵심 기술 결정

### Claude Code 제어 방식
- **선택**: PTY + stream-json
- **이유**:
  - 연속 세션 유지 가능 (`--continue`)
  - 실시간 JSON 스트림으로 파싱 용이
  - Claude Code의 모든 기능 활용 가능

### Slack 통신 방식
- **선택**: Socket Mode
- **이유**:
  - 웹훅 서버 불필요
  - 방화벽 설정 불필요
  - 실시간 양방향 통신

### 세션 관리
- **선택**: 사용자별 독립 프로세스
- **이유**:
  - 대화 컨텍스트 완벽 격리
  - 동시 다중 사용자 지원
  - 세션 상태 관리 단순화

## 📝 중요 파일 및 위치

### 소스 코드
- `src/index.ts` - 메인 서버 (152줄)
- `src/claude-session-manager.ts` - 세션 관리자 (106줄)
- `src/slack-mcp-client.ts` - MCP 클라이언트 (63줄)

### 설정 파일
- `package.json` - 의존성: @slack/bolt, node-pty, dotenv
- `docker-compose.yaml` - 2개 서비스 (bridge-server, slack-mcp-server)
- `.env.example` - 9개 환경 변수

### 문서
- `README.md` - 사용자 가이드
- `CLAUDE.md` - 개발자 가이드
- `PROJECT_STATUS.md` - 이 파일

## 🚨 알려진 이슈 및 제한사항

### 현재 제한사항
1. **세션 매핑**: 현재 코드에서 Slack Channel ID를 세션 키로 사용
   - 개선 필요: User ID → Channel ID 매핑 추가

2. **에러 처리**: 기본적인 try-catch만 구현
   - 개선 필요: 재시도 로직, 상세 에러 메시지

3. **JSON 파싱**: Claude 출력 형식에 의존
   - 위험: Claude CLI 출력 형식 변경 시 파싱 실패 가능

4. **퍼미션 우회**: `--dangerously-skip-permissions` 사용
   - 보안 주의: 신뢰할 수 있는 환경에서만 사용

### 테스트 필요 항목
- [ ] Claude Code stream-json 출력 형식 검증
- [ ] 다중 사용자 동시 접속 테스트
- [ ] 장시간 세션 유지 안정성
- [ ] 대용량 응답 처리
- [ ] 에러 상황 복구

## 💡 사용 시나리오

### 시나리오 1: 작업 확인 및 진행
```
사용자: @Claude 지금 남은 작업 알려줘
Claude: 현재 5개의 작업이 남아있습니다:
        1. API 엔드포인트 구현
        2. 데이터베이스 마이그레이션
        ...

사용자: 다음 작업 진행해줘
Claude: [파일 분석 → 코드 작성 → 저장]
        API 엔드포인트 구현을 완료했습니다!
```

### 시나리오 2: 코드 리뷰
```
사용자: @Claude src/index.ts 코드 리뷰해줘
Claude: [파일 읽기 → 분석]
        코드를 검토했습니다. 다음 개선 사항을 제안합니다:
        1. 에러 핸들링 추가
        2. 타입 안정성 개선
        ...
```

### 시나리오 3: 디버깅
```
사용자: @Claude 왜 서버가 시작되지 않는지 확인해줘
Claude: [로그 확인 → 설정 파일 읽기]
        문제를 발견했습니다. SLACK_BOT_TOKEN이 설정되지 않았습니다.
```

## 🔗 참고 자료

- **Slack API**: https://api.slack.com/
- **Slack Bolt**: https://slack.dev/bolt-js/
- **Claude Code Docs**: https://docs.claude.com/en/docs/claude-code/
- **Slack MCP Server**: https://github.com/korotovsky/slack-mcp-server
- **node-pty**: https://github.com/microsoft/node-pty

## 📞 연락처 및 지원

문제가 발생하면:
1. 로그 확인: `docker-compose logs -f bridge-server`
2. CLAUDE.md의 트러블슈팅 섹션 참고
3. GitHub Issues (프로젝트 공개 시)

---

**다음 세션에서 시작할 때**:
이 파일(`PROJECT_STATUS.md`)을 읽고 "다음 단계" 섹션부터 진행하세요.
