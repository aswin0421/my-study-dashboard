# ============================================================
# Only For Me — Docker 이미지
#   어디서든 같은 환경으로 실행: Render, Google Cloud Run, 가상 서버(EC2 등), 내 PC
#
#   빌드:  docker build -t my-study-dashboard .
#   실행:  docker run --env-file .env -p 8000:8000 my-study-dashboard   → http://localhost:8000
#   (또는  docker compose up --build)
#
#   비밀 값(.env)은 이미지에 넣지 않고 실행할 때 환경변수로 전달합니다. (.dockerignore 참고)
# ============================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# 1) 패키지 먼저 설치 — 코드만 바뀌었을 때는 이 단계를 다시 하지 않아서 빌드가 빠름
COPY requirements.txt .
RUN pip install -r requirements.txt

# 2) 코드 복사
COPY . .

# 3) 관리자(root)가 아닌 일반 사용자로 실행 (보안)
RUN useradd --create-home --uid 1000 app && chown -R app:app /app
USER app

EXPOSE 8000

# 서버가 살아 있는지 30초마다 /healthz 로 확인
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/healthz', timeout=3)"]

# 운영용 웹서버 실행 (설정은 gunicorn.conf.py)
CMD ["gunicorn", "app:app"]
