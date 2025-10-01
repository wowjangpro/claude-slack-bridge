import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface ClaudeMessage {
  type: 'text' | 'tool_use' | 'error';
  content: string;
}

export class ClaudeSessionManager extends EventEmitter {
  private activeProcesses: Map<string, ChildProcess> = new Map();

  constructor(
    private workspaceDir: string = process.cwd(),
    private claudePath: string = '/Users/jeniel/.local/share/mise/installs/node/24.8.0/bin/claude'
  ) {
    super();
  }

  /**
   * Claude에게 메시지 전송 (stdin 방식)
   */
  sendMessage(userId: string, message: string): void {
    console.log(`[메시지 전송] User ${userId}: ${message.substring(0, 50)}...`);

    // 이전 프로세스가 있으면 종료
    const existingProcess = this.activeProcesses.get(userId);
    if (existingProcess) {
      console.log(`[프로세스 종료] User ${userId}: 이전 요청 중단`);
      existingProcess.kill('SIGTERM');
      this.activeProcesses.delete(userId);
    }

    // 메시지에서 -c 옵션 확인 및 제거
    let actualMessage = message;
    let useContinue = true; // 기본값: 세션 유지

    if (message.trim().startsWith('-c ')) {
      useContinue = false; // -c 메시지가 있으면 새로 시작
      actualMessage = message.trim().substring(3).trim();
      console.log(`[새 세션 모드] -c 옵션 감지됨 (세션 초기화)`);
    }

    // 로그인 쉘을 통해 claude 실행 (인증 정보 자동 사용)
    // -p: print 모드 (비대화형)
    // -c: continue 모드 (기본값, 메시지에 -c가 있으면 사용하지 않음)
    // --permission-mode bypassPermissions: 권한 확인 생략
    const claudeOptions = useContinue
      ? 'claude -p -c --permission-mode bypassPermissions'
      : 'claude -p --permission-mode bypassPermissions';
    const command = `echo ${JSON.stringify(actualMessage)} | ${claudeOptions}`;

    console.log(`[명령 실행] ${command.substring(0, 80)}...`);

    const claudeProcess = spawn('/bin/zsh', ['-l', '-c', command], {
      cwd: this.workspaceDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: process.env.HOME,
        PATH: process.env.PATH
      }
    });

    // 프로세스 저장
    this.activeProcesses.set(userId, claudeProcess);

    let stdout = '';
    let stderr = '';
    let hasResponded = false;

    // 1시간 타임아웃 설정
    const timeout = setTimeout(() => {
      if (!hasResponded) {
        console.error(`[타임아웃] User ${userId}: 1시간 초과`);
        claudeProcess.kill('SIGTERM');
        hasResponded = true;
        this.activeProcesses.delete(userId);
        this.emit('error', userId, 'Claude 응답 시간이 1시간을 초과했습니다.');
      }
    }, 3600000);

    // 30초마다 대기중 메시지 전송
    let waitCount = 0;
    const waitInterval = setInterval(() => {
      if (!hasResponded) {
        waitCount++;
        this.emit('waiting', userId, `⏳ Claude 응답 대기중... (${waitCount * 30}초 경과)`);
      } else {
        clearInterval(waitInterval);
      }
    }, 30000);

    claudeProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      console.log(`[stdout 수신] ${text}`);
    });

    claudeProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      console.log(`[stderr 수신] ${text}`);
    });

    claudeProcess.on('close', (code: number) => {
      clearTimeout(timeout);
      clearInterval(waitInterval);
      this.activeProcesses.delete(userId);
      if (hasResponded) return;
      hasResponded = true;

      if (code === 0 && stdout) {
        console.log(`[Claude 응답] User ${userId}: ${stdout.substring(0, 100)}...`);
        this.emit('message', userId, {
          type: 'text',
          content: stdout.trim()
        });
      } else {
        console.error(`[Claude 에러] User ${userId}: ${stderr || 'Exit code: ' + code}`);
        this.emit('error', userId, stderr || `Process exited with code ${code}`);
      }
    });

    claudeProcess.on('error', (err: Error) => {
      clearTimeout(timeout);
      clearInterval(waitInterval);
      this.activeProcesses.delete(userId);
      if (hasResponded) return;
      hasResponded = true;
      console.error(`[프로세스 에러] User ${userId}:`, err);
      this.emit('error', userId, err.message);
    });
  }

  /**
   * 활성 세션 수 (호환성 유지)
   */
  getActiveSessionCount(): number {
    return 0; // -p -c 방식은 상태 없음
  }

  /**
   * 세션 종료 (호환성 유지)
   */
  closeSession(userId: string): void {
    // -p -c 방식은 세션이 없음
  }

  /**
   * 모든 세션 종료 (호환성 유지)
   */
  closeAllSessions(): void {
    // -p -c 방식은 세션이 없음
  }
}
