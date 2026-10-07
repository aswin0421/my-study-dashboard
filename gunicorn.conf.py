"""
gunicorn(운영용 웹서버) 설정 — Docker, Render, 가상 서버 어디서든 `gunicorn app:app` 만 실행하면 이 파일을 읽습니다.
(gunicorn 은 리눅스·맥 전용이라 내 윈도우 PC 에서는 지금처럼 `python app.py` 로 실행)

값은 환경변수로 바꿀 수 있습니다.
    PORT             : 접속 포트 (대부분의 배포 플랫폼이 자동으로 넣어줌, 기본 8000)
    WEB_CONCURRENCY  : 프로세스 수 (무료 서버는 메모리가 작아서 1 추천)
    GUNICORN_THREADS : 프로세스당 동시 처리 수
"""
import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = int(os.getenv("WEB_CONCURRENCY", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "4"))
timeout = 60

# 로그를 화면(표준 출력)으로 → 배포 플랫폼의 로그 화면에서 바로 보임
accesslog = "-"
errorlog = "-"
