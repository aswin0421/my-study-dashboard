from flask import Flask, render_template ,jsonify , request
import spotipy
from spotipy.oauth2 import SpotifyOAuth

app = Flask(__name__)
#발급받은 스포티파이 키를 입력
SPOTIPY_CLIENT_ID = '19f0f8675ca74d41b0dc00eb3b1100c0'
SPOTIPY_CLINET_SECRET = '19019ec34b97408596a3dcff2b52be5d'
SPOTIPY_REDIRECT_URI = 'http://127.0.0.1:5000/callback'

#현재 재생 상태 정보를 읽어오기 위한 권한 설정
scope = "user-read-currently-playing user-read-playback-state"

# OAuth 인증 객체 생성 (로컬에 .cache 파일로 토큰 자동 관리)
sp_oauth = SpotifyOAuth(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLINET_SECRET,
    redirect_uri=SPOTIPY_REDIRECT_URI,
    scope=scope,
    cache_path=".cache"
)
@app.route('/')
def home():
    return render_template('index.html')

#자격증 준비일지 서브 페이지 라우트
@app.route('/certification')
def certification():
    return render_template('certification.html')
#최초 인증시 스포티파이를 로그인하고 돌아오는 주소
@app.route('/callback')
def callback():
    try:
        # 1. 스포티파이가 URL에 달아준 인증 코드(code)를 뽑아옵니다.
        code = request.args.get('code')

        # 2. 이 코드를 제출해서 최종 로그인 토큰(권한)을 발급받아 .cache 파일에 저장합니다.
        sp_oauth.get_access_token(code)
        return """
        <html>
            <body style="background-color:#000; color:#fff; font-family:sans-serif; text-align:center; padding-top:100px;">
                <h2 style="color:#ff3b3b;">인증이 완료되었습니다!</h2>
                <p>이제 아카이브 웹사이트에서 실시간 음악 연동이 활성화됩니다.</p>
                <p>이 창을 닫고 메인 화면을 새로고침 해주세요.</p>
            </body>
        </html>
        """
    except Exception as e:
        return f"인증 실패: {str(e)}"


# 🎵 자바스크립트가 실시간(10초 주기)으로 호출할 음악 정보 데이터 API
@app.route('/api/spotify')
def get_spotify_status():
    try:
        # 내부에 저장된 로그인 토큰 정보 확인
        token_info = sp_oauth.get_cached_token()

        # 만약 로그인 기록이 아예 없다면 자바스크립트에게 로그인 URL을 던져줌
        if not token_info:
            auth_url = sp_oauth.get_authorize_url()
            return jsonify({"status": "need_auth", "auth_url": auth_url})

        # 로그인 토큰을 이용해 스포티파이 클라이언트 구동
        sp = spotipy.Spotify(auth=token_info['access_token'])
        current_track = sp.current_playback()

        # 현재 사용자가 노래를 재생 중인 경우 데이터 정제
        if current_track and current_track.get('is_playing'):
            track_item = current_track['item']
            title = track_item['name']

            # 가수가 여러 명일 수 있으므로 쉼표로 묶기
            artists = ", ".join([artist['name'] for artist in track_item['artists']])

            # 앨범 커버 이미지 URL 추출
            album_cover = track_item['album']['images'][1]['url'] if len(track_item['album']['images']) > 1 else \
            track_item['album']['images'][0]['url']

            album_name = track_item['album']['name']
            spotipy_link = track_item['external_urls']['spotify']
            return jsonify({
                "status": "playing",
                "title": title,
                "artist": artists,
                "cover": album_cover,
                "album": album_name,
                "link": spotipy_link
            })
        else:
            # 스포티파이 앱을 켜두지 않았거나 일시정지 상태인 경우
            return jsonify({
                "status": "not_playing",
                "title": "재생 중인 곡 없음",
                "artist": "Spotify 멈춤"
            })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True)