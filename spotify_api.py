"""
Spotify 연동
    /callback     : 최초 1회 스포티파이 로그인 후 돌아오는 주소 (토큰을 .cache 파일에 저장)
    /api/spotify  : 자바스크립트가 5초마다 호출하는 '현재 재생 중인 곡' 정보 API
"""
import os

import spotipy
from flask import Blueprint, jsonify, render_template, request
from spotipy.oauth2 import SpotifyOAuth

spotify_bp = Blueprint("spotify", __name__)

# 현재 재생 상태 정보를 읽어오기 위한 권한 설정
SCOPE = "user-read-currently-playing user-read-playback-state"

# OAuth 인증 객체 생성 (로컬에 .cache 파일로 토큰 자동 관리)
sp_oauth = SpotifyOAuth(
    client_id=os.getenv("SPOTIPY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI"),
    scope=SCOPE,
    cache_path=".cache",
)


@spotify_bp.route("/callback")
def callback():
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
    try:
        # 저장된 로그인 토큰 확인 (만료됐으면 자동으로 갱신)
        token_info = sp_oauth.validate_token(sp_oauth.cache_handler.get_cached_token())

        # 로그인 기록이 아예 없다면 자바스크립트에게 로그인 URL을 던져줌
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
