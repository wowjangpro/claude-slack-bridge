FROM node:20-alpine

# 필수 도구 설치
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY package*.json tsconfig.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY src ./src

# TypeScript 빌드
RUN npm run build

# Claude Code CLI 설치
RUN npm install -g @anthropic-ai/claude-code

# 환경 변수 기본값
ENV PORT=3000
ENV WORKSPACE_DIR=/workspace

# 워크스페이스 디렉토리 생성
RUN mkdir -p /workspace

# 비root 사용자 생성 및 권한 설정
RUN adduser -D -u 10001 appuser && \
    chown -R appuser:appuser /app /workspace

# Claude CLI 설정 디렉토리 생성
RUN mkdir -p /home/appuser/.claude && \
    chown -R appuser:appuser /home/appuser/.claude

# Entrypoint 스크립트 복사
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 사용자 전환
USER appuser

# 포트 노출
EXPOSE 3000

# Entrypoint 설정
ENTRYPOINT ["/docker-entrypoint.sh"]

# 실행
CMD ["npm", "start"]
