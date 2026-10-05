import mimetypes
import os

from dotenv import load_dotenv
from flask import Flask, abort, redirect, render_template, url_for

# .env 값을 먼저 읽어야 아래 모듈들(스포티파이 키 등)이 값을 사용할 수 있습니다.
load_dotenv()

from categories import CATEGORIES, CATEGORY_MAP  # noqa: E402
from spotify_api import spotify_bp  # noqa: E402

# 일부 윈도우 PC는 .js 파일 형식이 잘못 등록돼 있어서 자바스크립트 모듈이 안 불러와지는 문제 방지
mimetypes.add_type("text/javascript", ".js")

app = Flask(__name__)
app.register_blueprint(spotify_bp)  # /callback, /api/spotify


# 모든 템플릿에서 공통으로 쓰는 값 (Supabase 접속 정보, 카테고리 목록)
@app.context_processor
def inject_globals():
    return {
        "supabase_url": os.getenv("SUPABASE_URL"),
        "supabase_key": os.getenv("SUPABASE_KEY"),
        "categories": CATEGORIES,
    }


@app.route("/")
def home():
    return render_template("index.html")


# 카테고리 페이지 (예: /category/cpp) — 카테고리 목록은 categories.py 에서 관리
@app.route("/category/<slug>")
def category(slug):
    cat = CATEGORY_MAP.get(slug)
    if cat is None:
        abort(404)
    return render_template("category.html", category=cat)


# 예전 주소(/webservice) 즐겨찾기 호환용
@app.route("/webservice")
def webservice_redirect():
    return redirect(url_for("category", slug="webservice"))


@app.errorhandler(404)
def not_found(e):
    return render_template("message.html", ok=False, title="페이지를 찾을 수 없습니다",
                           message="주소를 다시 확인해주세요."), 404


if __name__ == "__main__":
    app.run(debug=True)
