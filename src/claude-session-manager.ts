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
   * Claude에게 메시지 전송 (스트리밍 방식)
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

    // 프로세스 저장
    this.activeProcesses.set(userId, claudeProcess);

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

          // assistant 메시지 처리
          if (json.type === 'assistant' && json.message?.content) {
            for (const content of json.message.content) {
              if (content.type === 'text' && content.text) {
                console.log(`[스트리밍 텍스트] ${content.text.substring(0, 100)}...`);
                streamedTexts.push(content.text);
                this.emit('stream', userId, content.text);
              } else if (content.type === 'tool_use') {
                console.log(`[도구 사용] ${content.name}`);
                this.emit('tool_use', userId, content.name, content.input);
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

              // 스트리밍으로 이미 전송된 내용과 최종 결과 비교
              const allStreamedText = streamedTexts.join('\n');
              const finalResult = json.result.trim();

              // 최종 결과가 스트리밍 내용과 다르면 전송
              if (finalResult && finalResult !== allStreamedText) {
                this.emit('message', userId, {
                  type: 'text',
                  content: `✅ 완료:\n${finalResult}`
                });
              }
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
    const process = this.activeProcesses.get(userId);
    if (process) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(userId);
    }
  }

  /**
   * 모든 세션 종료
   */
  closeAllSessions(): void {
    for (const [userId, process] of this.activeProcesses) {
      process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }
}
