# Claude Slack Bridge - GUI Version

Slack과 Claude Code CLI를 연결하는 Electron 기반 데스크톱 애플리케이션입니다.

## 주요 기능

- **초기 설정 마법사**: 단계별 가이드로 쉬운 설정
- **실시간 모니터링**: Slack과 Claude 간 대화 내용 실시간 확인
- **연결 상태 표시**: 현재 연결 상태를 시각적으로 확인
- **통계 대시보드**: 메시지 수, 평균 응답 시간, 에러 수 등
- **재연결 기능**: 버튼 클릭으로 쉬운 재연결
- **설정 관리**: GUI를 통한 간편한 설정 변경
- **작업 경로 변경**: 진행 중인 작업 확인 후 안전한 경로 변경

## 설치 및 실행

### 필수 요구사항

- Node.js 18 이상
- Claude Code CLI (설치 방법: `npm install -g @anthropic-ai/claude-code`)
- Slack Bot 설정 (README.md 참고)

### 개발 모드

```bash
# 의존성 설치
npm install

# Electron 앱 실행
npm run dev:electron
```

개발 모드에서는 다음과 같이 동작합니다:
- Vite 개발 서버가 http://localhost:5173에서 실행
- Main Process가 tsx watch로 실행되어 자동 재시작
- React 코드 수정 시 Hot Module Replacement로 즉시 반영

### 프로덕션 빌드

```bash
# 빌드
npm run build:electron

# macOS .dmg 및 .zip 생성
# release/ 디렉토리에 생성됨
```

빌드 결과물:
- `release/Claude Slack Bridge-2.0.0.dmg` - 설치 이미지
- `release/Claude Slack Bridge-2.0.0-mac.zip` - 압축 파일

### 기존 CLI 버전 실행

CLI 버전도 계속 사용 가능합니다:

```bash
# 개발 모드
npm run dev:cli

# 빌드 및 실행
npm run build:cli
npm run start:cli
```

## 사용 방법

### 1. 초기 설정

앱을 처음 실행하면 설정 마법사가 나타납니다:

1. **환영 화면**: 필요한 정보 확인
2. **Slack 설정**: Bot Token, App Token, Signing Secret, Bot User ID 입력
3. **워크스페이스**: 작업 디렉토리와 Claude CLI 경로 설정
4. **사용자 권한**: 허용할 사용자 ID 목록 입력
5. **완료**: 자동으로 Slack Bot 시작

### 2. 메인 화면

설정 완료 후 메인 화면이 표시됩니다:

- **상단 헤더**
  - 연결 상태 표시 (연결됨/연결 중/연결 안됨/오류)
  - 재연결 버튼
  - 로그 지우기 버튼
  - 설정 버튼

- **대화 로그 영역**
  - 실시간 메시지 스트림
  - 메시지 타입별 색상 구분
  - 타임스탬프 및 사용자 정보
  - 자동 스크롤

- **통계 영역**
  - 메시지 수
  - 평균 응답 시간
  - 에러 수
  - 세션 시작 시간

### 3. 설정 화면

설정 화면에서 모든 설정을 변경할 수 있습니다:

- Slack Bot 토큰들
- 작업 디렉토리
- Claude CLI 경로
- 허용된 사용자 ID

**주의**: 작업 경로 변경 시 진행 중인 작업이 있으면 확인 대화상자가 표시됩니다.

## 프로젝트 구조

```
claude-slack-bridge/
├── electron-src/
│   ├── main/                    # Main Process
│   │   ├── index.ts            # 앱 엔트리
│   │   ├── bridge-manager.ts   # Slack Bridge 관리
│   │   ├── config-manager.ts   # 설정 관리
│   │   ├── ipc-handlers.ts     # IPC 통신
│   │   └── claude-session-manager.ts
│   ├── renderer/                # Renderer Process (UI)
│   │   ├── pages/
│   │   │   ├── SetupWizard.tsx
│   │   │   ├── Main.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── ConnectionStatus.tsx
│   │   │   ├── MessageLog.tsx
│   │   │   └── Statistics.tsx
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── store.ts            # Zustand 상태 관리
│   ├── preload/
│   │   └── index.ts            # 보안 IPC 브리지
│   └── shared/
│       └── types.ts            # 공유 타입
├── src/                         # CLI 버전 (기존)
│   ├── index.ts
│   └── claude-session-manager.ts
├── package.json
├── tsconfig.json               # CLI 버전용
├── tsconfig.electron.json      # Electron용
├── vite.config.ts
└── index.html
```

## 기술 스택

- **Electron**: 26.x - 데스크톱 앱 프레임워크
- **React**: 18.x - UI 라이브러리
- **TypeScript**: 5.x - 타입 안전성
- **Ant Design**: 5.x - UI 컴포넌트
- **Zustand**: 4.x - 상태 관리
- **Vite**: 5.x - 빌드 도구
- **electron-builder**: macOS 앱 패키징
- **electron-store**: 암호화된 설정 저장

## 개발 가이드

### 스크립트 설명

```bash
# CLI 버전
npm run dev:cli           # CLI 개발 모드
npm run build:cli         # CLI 빌드
npm run start:cli         # CLI 실행

# Electron GUI 버전
npm run dev:electron      # GUI 개발 모드
npm run build:electron    # GUI 빌드 (.dmg 생성)
npm run start:electron    # 빌드된 앱 실행

# 개별 실행
npm run dev:vite          # Vite만 실행
npm run dev:electron-main # Main Process만 실행
npm run build:vite        # Renderer 빌드
npm run build:electron-main # Main Process 빌드
```

### 디버깅

개발 모드에서는 다음 도구를 사용할 수 있습니다:

- **Chrome DevTools**: Renderer Process 디버깅
- **Console.log**: Main Process 로그는 터미널에 출력
- **React DevTools**: Renderer Process 상태 확인

### 빌드 설정

`package.json`의 `build` 섹션에서 빌드 옵션을 변경할 수 있습니다:

```json
{
  "build": {
    "appId": "com.claudeslackbridge.app",
    "productName": "Claude Slack Bridge",
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": ["dmg", "zip"]
    }
  }
}
```

## 트러블슈팅

### 앱이 시작되지 않음

```bash
# 캐시 삭제
rm -rf node_modules dist-electron dist-vite
npm install
npm run build:electron
```

### 설정이 저장되지 않음

설정은 electron-store를 통해 다음 위치에 저장됩니다:
- macOS: `~/Library/Application Support/claude-slack-bridge-config/`

설정 파일을 직접 삭제하려면:
```bash
rm -rf ~/Library/Application\ Support/claude-slack-bridge-config/
```

### 개발 모드에서 Renderer가 로드되지 않음

Vite 서버가 제대로 시작되었는지 확인:
```bash
# 별도 터미널에서 Vite만 실행
npm run dev:vite

# 다른 터미널에서 Electron 실행
npm run dev:electron-main
```

## 향후 계획

- [ ] 트레이 아이콘 추가
- [ ] macOS 네이티브 알림
- [ ] 로그 내보내기 기능
- [ ] 다크 모드 지원
- [ ] 자동 업데이트
- [ ] 복수 워크스페이스 프로필

## 라이선스

MIT

## 기여

Pull Request를 환영합니다!
