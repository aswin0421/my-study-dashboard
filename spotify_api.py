"""
Spotify 연동
    /callback     : 최초 1회 스포티파이 로그인 후 돌아오는 주소 (토큰을 .cache 파일에 저장)
    /api/spotify  : 자바스크립트가 5초마다 호출하는 '현재 재생 중인 곡' 정보 API

두 가지 모드로 동작합니다.
    - 내 PC (로컬)  : 지금처럼 .cache 파일에 토큰 저장, 위젯을 눌러 스포티파이 로그인
    - 서버 (배포)   : 환경변수 SPOTIFY_REFRESH_TOKEN 이 있으면 그 토큰으로만 동작
                      · 서버는 재시작할 때마다 파일이 지워져서 .cache 를 쓸 수 없음
                      · 방문자가 자기 스포티파이로 로그인해서 내 위젯을 바꾸지 못하게 로그인 기능을 끔
                      · 토큰 값은 scripts/spotify_refresh_token.py 로 확인
"""
import os

import spotipy
from flask import Blueprint, jsonify, render_template, request
from spotipy.cache_handler import CacheFileHandler, MemoryCacheHandler
from spotipy.oauth2 import SpotifyOAuth

spotify_bp = Blueprint("spotify", __name__)

# 현재 재생 상태 정보를 읽어오기 위한 권한 설정
SCOPE = "user-read-currently-playing user-read-playback-state"

# 서버(배포) 모드에서 쓰는 내 스포티파이 토큰 (없으면 로컬 모드)
REFRESH_TOKEN = (os.getenv("SPOTIFY_REFRESH_TOKEN") or "").strip()

# 스포티파이 키가 없으면(테스트 서버, 다른 프로젝트에 재사용 등) 사이트는 그대로 두고 위젯만 끔
ENABLED = bool(os.getenv("SPOTIPY_CLIENT_ID") and os.getenv("SPOTIPY_CLIENT_SECRET"))

# OAuth 인증 객체 생성 (로컬: .cache 파일 / 서버: 메모리에 토큰 보관)
sp_oauth = SpotifyOAuth(
    client_id=os.getenv("SPOTIPY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
    # 서버 모드에서는 로그인 화면을 안 쓰지만 spotipy 가 값을 요구해서 기본값을 넣어둠
    redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI") or "http://127.0.0.1:5000/callback",
    scope=SCOPE,
    cache_handler=MemoryCacheHandler() if REFRESH_TOKEN else CacheFileHandler(cache_path=".cache"),
    open_browser=False,
) if ENABLED else None


def _get_token_info():
    """저장된 토큰 (만료됐으면 자동 갱신). 서버 모드에서 처음이면 환경변수 토큰으로 발급."""
    token_info = sp_oauth.validate_token(sp_oauth.cache_handler.get_cached_token())
    if token_info is None and REFRESH_TOKEN:
        token_info = sp_oauth.refresh_access_token(REFRESH_TOKEN)
    return token_info


@spotify_bp.route("/callback")
def callback():
    if REFRESH_TOKEN or not ENABLED:
        # 서버에서는 다른 사람이 로그인해서 토큰을 바꾸지 못하게 막아둠
        return render_template("message.html", ok=False, title="사용할 수 없는 기능",
                               message="이 서버에서는 스포티파이 로그인을 사용하지 않습니다."), 404

    # 1. 스포티파이가 URL에 달아준 인증 코드(code)를 뽑아옵니다.
    code = request.args.get("code")
    if not code:
        # 사용자가 스포티파이 로그인 화면에서 '취소'를 누른 경우
        return render_template("message.html", ok=False, title="인증 실패",
                               message="스포티파이 로그인이 취소되었습니다.")

    try:
        # 2. 이 코드를 제출해서 최종 로그인 토큰(권한)을 발급받아 .cache 파일에 저장합니다.
        sp_oauth.get_access_token(code, as_dict=False)
    except Exception as e:
        return render_template("message.html", ok=False, title="인증 실패", message=str(e))

    return render_template("message.html", ok=True, title="인증이 완료되었습니다!",
                           message="이제 실시간 음악 연동이 활성화됩니다. 이 창을 닫고 메인 화면을 새로고침 해주세요.")


def _pick_cover(images):
    """앨범 커버 중 중간 크기 이미지 URL (로컬 파일 곡은 이미지가 없을 수 있음)"""
    if len(images) > 1:
        return images[1]["url"]
    return images[0]["url"] if images else None


@spotify_bp.route("/api/spotify")
def spotify_status():
    if not ENABLED:
        return jsonify(status="disabled")  # 위젯 숨김

    try:
        token_info = _get_token_info()

        # 로컬에서 로그인 기록이 아예 없다면 자바스크립트에게 로그인 URL을 던져줌
        if not token_info:
            return jsonify(status="need_auth", auth_url=sp_oauth.get_authorize_url())

        playback = spotipy.Spotify(auth=token_info["access_token"]).current_playback()

        # 일시정지 상태이거나, 광고·팟캐스트 재생 중이라 곡 정보(item)가 없는 경우
        track = playback.get("item") if playback and playback.get("is_playing") else None
        if not track:
            return jsonify(status="not_playing")

        return jsonify(
            status="playing",
            title=track["name"],
            # 가수가 여러 명일 수 있으므로 쉼표로 묶기
            artist=", ".join(artist["name"] for artist in track["artists"]),
            cover=_pick_cover(track["album"]["images"]),
            album=track["album"]["name"],
            link=track["external_urls"].get("spotify"),
        )

    except Exception as e:
        return jsonify(status="error", message=str(e))
