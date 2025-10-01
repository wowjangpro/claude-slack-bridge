const { spawn } = require('child_process');

const command = `echo "1+1?" | claude -p`;

console.log(`[테스트] 명령 실행: ${command}`);

const claudeProcess = spawn('/bin/zsh', ['-l', '-c', command], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

claudeProcess.stdout.on('data', (data) => {
  const text = data.toString();
  stdout += text;
  console.log(`[stdout] ${text}`);
});

claudeProcess.stderr.on('data', (data) => {
  const text = data.toString();
  stderr += text;
  console.log(`[stderr] ${text}`);
});

claudeProcess.on('close', (code) => {
  console.log(`[종료] code: ${code}`);
  console.log(`[최종 stdout] ${stdout}`);
  console.log(`[최종 stderr] ${stderr}`);
});

claudeProcess.on('error', (err) => {
  console.error(`[에러] ${err.message}`);
});
