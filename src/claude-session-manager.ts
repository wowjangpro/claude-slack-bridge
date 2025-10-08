import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface ClaudeMessage {
  type: 'text' | 'tool_use' | 'error';
  content: string;
}

interface ProcessInfo {
  process: ChildProcess;
  timeout?: NodeJS.Timeout;
  waitInterval?: NodeJS.Timeout;
}

export class ClaudeSessionManager extends EventEmitter {
  private activeProcesses: Map<string, ProcessInfo> = new Map();

  constructor(
    private workspaceDir: string = process.cwd(),
    private claudePath: string = process.env.CLAUDE_PATH || 'claude'
  ) {
    super();
  }

  /**
   * Claude에게 메시지 전송 (스트리밍 방식)
   */
  sendMessage(userId: string, message: string): void {
    console.log(`[메시지 전송] User ${userId}: ${message.substring(0, 50)}...`);

    // 중지 명령어 처리
    const trimmedMessage = message.trim().toLowerCase();
    if (trimmedMessage === '중지' || trimmedMessage === 'stop' || trimmedMessage === '그만') {
      const processInfo = this.activeProcesses.get(userId);
      if (processInfo) {
        console.log(`[수동 중지] User ${userId}: 작업 중단`);

        // 타이머 정리
        if (processInfo.timeout) clearTimeout(processInfo.timeout);
        if (processInfo.waitInterval) clearInterval(processInfo.waitInterval);

        // 모든 리스너 제거
        processInfo.process.stdout?.removeAllListeners();
        processInfo.process.stderr?.removeAllListeners();
        processInfo.process.removeAllListeners();

        // 프로세스 강제 종료
        processInfo.process.kill('SIGKILL');
        this.activeProcesses.delete(userId);

        this.emit('message', userId, {
          type: 'text',
          content: '✅ 작업이 중지되었습니다.'
        });
      } else {
        this.emit('message', userId, {
          type: 'text',
          content: 'ℹ️ 실행 중인 작업이 없습니다.'
        });
      }
      return;
    }

    // 이전 프로세스가 있으면 종료
    const processInfo = this.activeProcesses.get(userId);
    if (processInfo) {
      console.log(`[프로세스 종료] User ${userId}: 이전 요청 중단`);
      if (processInfo.timeout) clearTimeout(processInfo.timeout);
      if (processInfo.waitInterval) clearInterval(processInfo.waitInterval);
      processInfo.process.kill('SIGTERM');
      this.activeProcesses.delete(userId);
    }

    // 메시지에서 -clear 옵션 확인 및 제거
    let actualMessage = message;
    let useContinue = true; // 기본값: 세션 유지 (-c 사용)

    if (message.trim().startsWith('-clear ')) {
      useContinue = false; // -clear 메시지가 있으면 새로 시작 (-c 사용 안 함)
      actualMessage = message.trim().substring(7).trim();
      console.log(`[새 세션 모드] -clear 옵션 감지됨 (세션 초기화)`);
    }

    // --verbose --output-format stream-json 옵션 추가
    const claudeOptions = useContinue
      ? 'claude -p -c --permission-mode bypassPermissions --verbose --output-format stream-json'
      : 'claude -p --permission-mode bypassPermissions --verbose --output-format stream-json';
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

    let buffer = '';
    let hasResponded = false;
    let streamedTexts: string[] = []; // 스트리밍된 텍스트 저장

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

    // 프로세스 정보 저장 (타이머 포함)
    this.activeProcesses.set(userId, {
      process: claudeProcess,
      timeout,
      waitInterval
    });

    // 스트리밍 JSON 파싱
    claudeProcess.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();

      // 줄 단위로 파싱
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 마지막 불완전한 줄은 버퍼에 보관

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const json = JSON.parse(line);
          console.log(`[JSON 수신] Type: ${json.type}, Subtype: ${json.subtype || 'N/A'}`);

          // system 메시지 처리 (세션 초기화 정보)
          if (json.type === 'system' && json.subtype === 'init') {
            const sessionInfo = `🔵 세션 시작\n` +
              `• 세션 ID: ${json.session_id?.substring(0, 8)}...\n` +
              `• 모델: ${json.model}\n` +
              `• 작업 디렉토리: ${json.cwd}`;
            this.emit('stream', userId, sessionInfo);
            // 응답이 시작되었으므로 대기 시간 초기화
            waitCount = 0;
          }

          // assistant 메시지 처리
          if (json.type === 'assistant' && json.message?.content) {
            for (const content of json.message.content) {
              if (content.type === 'text' && content.text) {
                console.log(`[스트리밍 텍스트] ${content.text.substring(0, 100)}...`);
                streamedTexts.push(content.text);
                this.emit('stream', userId, content.text);
                // 응답을 받았으므로 대기 시간 초기화
                waitCount = 0;
              } else if (content.type === 'tool_use') {
                console.log(`[도구 사용] ${content.name}`);
                const toolInfo = `🔧 도구 사용: ${content.name}\n` +
                  `입력: ${JSON.stringify(content.input, null, 2).substring(0, 200)}...`;
                this.emit('tool_use', userId, content.name, toolInfo);
                // 응답을 받았으므로 대기 시간 초기화
                waitCount = 0;
              }
            }
          }

          // 최종 결과 처리
          if (json.type === 'result') {
            hasResponded = true;
            clearTimeout(timeout);
            clearInterval(waitInterval);

            if (json.subtype === 'success' && json.result) {
              console.log(`[최종 결과] ${json.result.substring(0, 100)}...`);

              // 작업 완료 메시지 전송
              this.emit('message', userId, {
                type: 'text',
                content: '✅ 작업 완료'
              });
            } else if (json.subtype === 'error') {
              console.error(`[Claude 에러] ${json.error || 'Unknown error'}`);
              this.emit('error', userId, json.error || 'Unknown error');
            }
          }

        } catch (e) {
          console.log(`[JSON 파싱 실패] ${line.substring(0, 100)}`);
        }
      }
    });

    claudeProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      console.log(`[stderr] ${text}`);
    });

    claudeProcess.on('close', (code: number) => {
      clearTimeout(timeout);
      clearInterval(waitInterval);
      this.activeProcesses.delete(userId);

      if (!hasResponded) {
        hasResponded = true;
        if (code !== 0) {
          console.error(`[프로세스 종료] User ${userId}: Exit code ${code}`);
          this.emit('error', userId, `Process exited with code ${code}`);
        }
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
    return this.activeProcesses.size;
  }

  /**
   * 세션 종료
   */
  closeSession(userId: string): void {
    const processInfo = this.activeProcesses.get(userId);
    if (processInfo) {
      if (processInfo.timeout) clearTimeout(processInfo.timeout);
      if (processInfo.waitInterval) clearInterval(processInfo.waitInterval);
      processInfo.process.kill('SIGTERM');
      this.activeProcesses.delete(userId);
    }
  }

  /**
   * 모든 세션 종료
   */
  closeAllSessions(): void {
    for (const [userId, processInfo] of this.activeProcesses) {
      if (processInfo.timeout) clearTimeout(processInfo.timeout);
      if (processInfo.waitInterval) clearInterval(processInfo.waitInterval);
      processInfo.process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }
}
