"""
서버(Render)에 넣을 스포티파이 refresh token 확인용

    1. 내 PC 에서 사이트를 켜고 스포티파이 위젯으로 로그인해 둔 상태여야 함 (.cache 파일이 있어야 함)
    2. 프로젝트 폴더에서 실행:  python scripts/spotify_refresh_token.py
    3. 출력된 값을 Render 환경변수 SPOTIFY_REFRESH_TOKEN 에 붙여넣기

⚠️ 이 값은 비밀번호와 같습니다. 채팅·깃허브·스크린샷에 올리지 마세요.
"""
import json
import sys
from pathlib import Path

CACHE_FILE = Path(__file__).resolve().parent.parent / ".cache"

if not CACHE_FILE.exists():
    sys.exit("[오류] .cache 파일이 없습니다. 내 PC 에서 사이트를 켜고 스포티파이 위젯으로 먼저 로그인하세요.")

token = json.loads(CACHE_FILE.read_text(encoding="utf-8")).get("refresh_token")
if not token:
    sys.exit("[오류] .cache 에 refresh_token 이 없습니다. .cache 를 지우고 스포티파이에 다시 로그인하세요.")

print("아래 값을 Render 환경변수 SPOTIFY_REFRESH_TOKEN 에 붙여넣으세요:\n")
print(token)
