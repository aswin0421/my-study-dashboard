"""
공부 카테고리 목록 — 카테고리를 추가하거나 고치려면 이 파일만 수정하면 됩니다.

    slug        : 주소(/category/<slug>)와 DB(todos.category, logs.category)에 저장되는 영문 이름
                  ⚠️ 이미 데이터가 쌓인 카테고리의 slug 를 바꾸면 예전 기록이 안 보이게 됩니다.
    title       : 화면에 보이는 이름
    short       : 상단 메뉴에 보이는 짧은 이름
    description : 카드와 페이지 상단에 보이는 설명 (비워도 됨)
    icon        : 카드에 표시되는 이모지
"""

CATEGORIES = [
    {
        "slug": "cpp",
        "title": "C / C++ 공부일지",
        "short": "C/C++",
        "description": "",
        "icon": "💻",
    },
    {
        "slug": "toeic",
        "title": "TOEIC 공부일지",
        "short": "TOEIC",
        "description": "",
        "icon": "📘",
    },
    {
        "slug": "certificate",
        "title": "자격증 준비",
        "short": "자격증",
        "description": "한국사",
        "icon": "📜",
    },
    {
        "slug": "webservice",
        "title": "웹 서비스 프로젝트",
        "short": "웹 서비스",
        "description": "Python Flask 기반의 나만의 웹사이트 제작",
        "icon": "🌐",
    },
]

# slug 로 카테고리를 바로 찾기 위한 사전 (예: CATEGORY_MAP["cpp"])
CATEGORY_MAP = {category["slug"]: category for category in CATEGORIES}
