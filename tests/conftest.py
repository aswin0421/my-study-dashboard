"""
테스트 공통 설정 — 실행: python -m pytest

테스트는 외부 서비스(Supabase·Spotify·Discord)에 접속하지 않습니다.
그래서 .env 에 키가 있어도 스포티파이를 '꺼진 상태'로 강제합니다.
"""
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

# app 을 불러오기 전에 설정해야 함 (load_dotenv 는 이미 있는 환경변수를 덮어쓰지 않음)
for key in ("SPOTIPY_CLIENT_ID", "SPOTIPY_CLIENT_SECRET", "SPOTIFY_REFRESH_TOKEN"):
    os.environ[key] = ""

import app as flask_app  # noqa: E402


@pytest.fixture
def client():
    flask_app.app.config.update(TESTING=True)
    return flask_app.app.test_client()
