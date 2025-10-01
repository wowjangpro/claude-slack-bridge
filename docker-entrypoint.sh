#!/bin/sh
set -e

# Claude 설정 디렉토리 생성
mkdir -p /home/appuser/.claude/config

# 호스트의 인증 정보가 있으면 복사 (모든 파일 강제 덮어쓰기)
if [ -d "/host-claude" ] && [ "$(ls -A /host-claude 2>/dev/null)" ]; then
  echo "복사 중: 호스트 Claude 설정..."
  cp -rf /host-claude/* /home/appuser/.claude/ 2>/dev/null || true

  # settings.json 병합 (온보딩 완료 플래그 추가)
  if [ -f "/home/appuser/.claude/settings.json" ]; then
    echo "온보딩 플래그 추가 중..."
    # 기존 설정 유지하면서 온보딩 완료 추가
    cat > /tmp/settings.json << 'EOF'
{
  "hasCompletedOnboarding": true,
  "permissionMode": "bypassPermissions"
}
EOF
    # 파일이 있으면 그대로 두고 없으면 생성
    if ! grep -q "hasCompletedOnboarding" /home/appuser/.claude/settings.json 2>/dev/null; then
      # JSON 병합 (간단한 방식)
      cp /tmp/settings.json /home/appuser/.claude/settings.json
    fi
  fi
else
  # 호스트 설정 없으면 기본 설정 생성
  echo "생성 중: Claude 기본 설정..."
  cat > /home/appuser/.claude/settings.json << 'EOF'
{
  "theme": "dark",
  "permissionMode": "bypassPermissions",
  "hasCompletedOnboarding": true
}
EOF
fi

# 장기 토큰이 환경변수에 있으면 설정 파일로 저장
if [ ! -z "$ANTHROPIC_API_KEY" ]; then
  echo "장기 토큰 설정 중..."
  echo "$ANTHROPIC_API_KEY" > /home/appuser/.claude/config/auth_token
  chmod 600 /home/appuser/.claude/config/auth_token
fi

echo "Claude 설정 완료!"
ls -la /home/appuser/.claude/

# 원래 명령 실행
exec "$@"
