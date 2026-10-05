# my-study-dashboard

**Only For Me** — 개인 공부 대시보드 (컴공 23 박내훈 · devsign project)

캘린더 일정, 카테고리별 Todo · 공부 일지(사진/파일 첨부), 실시간 Spotify 재생 곡을 한 화면에서 관리하는 Flask 웹사이트입니다.

## 기술 스택

- **Backend**: Python 3.9 · Flask · spotipy
- **DB / 파일 저장소 / 로그인**: Supabase (PostgreSQL, Storage, Auth)
- **Frontend**: Jinja 템플릿 · 바닐라 JS (ES Modules) · CSS 변수 기반 다크 테마 · Pretendard 폰트

## 폴더 구조

```
app.py               # 페이지 라우트 (홈, 카테고리, 404)
categories.py        # ⭐ 공부 카테고리 목록 — 카테고리 추가/수정은 여기만
spotify_api.py       # Spotify 로그인(/callback) · 현재 재생 곡 API(/api/spotify)
templates/
  base.html          # 공통 틀 (상단 바, 로그인/스포티파이/사진 팝업, 스크립트)
  index.html         # 메인: 캘린더 + 카테고리 카드
  category.html      # 카테고리 공통 페이지: Todo + 공부 일지
  message.html       # 안내 페이지 (스포티파이 인증 결과, 404)
static/
  css/style.css      # 색·간격은 맨 위 :root 변수에서 한 번에 변경
  js/main.js         # 시작점 — 페이지에 있는 기능만 켬
  js/lib/            # 공통 도구: supabase 연결, 로그인, 팝업, 토스트 알림, 도우미 함수
  js/features/       # 화면 기능: spotify, calendar, todos, logs, image-viewer
supabase/
  owner_only.sql     # "보는 건 누구나, 수정은 나만" 보안 설정 (Supabase SQL Editor 에서 실행)
```

## 실행 방법

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # .env 에 Supabase / Spotify 키 입력
python app.py               # http://127.0.0.1:5000
```

## 카테고리 추가하기

`categories.py` 의 `CATEGORIES` 목록에 항목 하나만 추가하면 상단 메뉴 · 메인 카드 · `/category/<slug>` 페이지가 자동으로 생깁니다.

```python
{
    "slug": "algorithm",          # 주소와 DB 에 저장되는 이름 (한 번 정하면 바꾸지 않기)
    "title": "알고리즘 공부일지",
    "short": "알고리즘",           # 상단 메뉴 이름
    "description": "백준 문제 풀이 기록",
    "icon": "🧩",
},
```

## Supabase 테이블

| 테이블 | 주요 컬럼 |
|---|---|
| `calendar` | `event_date` (`memo_YYYY_M_D`, 월은 0부터) · `content` |
| `todos` | `category` · `todo_date` (YYYY-MM-DD) · `task_text` · `completed` |
| `logs` | `category` · `log_date` (YYYY-MM-DD) · `title` · `content` · `image_url` · `file_url` |
| Storage `log_files` | 일지 첨부 사진/파일 (공개 버킷) |
