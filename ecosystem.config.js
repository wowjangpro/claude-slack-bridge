module.exports = {
  apps: [{
    name: 'claude-slack-bridge',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // 재시작 정책
    exp_backoff_restart_delay: 100,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
