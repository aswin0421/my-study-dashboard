"""
공부 카테고리 목록 — 카테고리를 추가하거나 고치려면 이 파일만 수정하면 됩니다.

    slug        : 주소(/category/<slug>)와 DB(todos.category, logs.category)에 저장되는 영문 이름
                  ⚠️ 이미 데이터가 쌓인 카테고리의 slug 를 바꾸면 예전 기록이 안 보이게 됩니다.
    title       : 화면에 보이는 이름
    short       : 상단 메뉴에 보이는 짧은 이름
    description : 카드와 페이지 상단에 보이는 설명 (비워도 됨)
    icon        : 카드에 표시되는 이모지
    labels      : 기록 칸에 보이는 문구 (없으면 아래 DEFAULT_LABELS 의 공부일지 문구를 씀)
"""

# 기록 칸 기본 문구 — 카테고리에 labels 가 있으면 그 항목만 덮어씀
DEFAULT_LABELS = {
    "panel": "Today Study",                      # 작성칸 제목
    "list": "Study List",                        # 목록 제목
    "noun": "일지",                              # '새 일지', '일지를 저장했습니다' 처럼 쓰임 (받침 없는 단어로)
    "placeholder": "오늘 공부한 내용을 적어주세요",  # 본문 입력칸 안내
}

CATEGORIES = [
    {
        "slug": "diary",
        "title": "일기장",
        "short": "일기장",
        "description": "",
        "icon": "📔",
        "labels": {
            "panel": "Today Diary",
            "list": "Diary List",
            "noun": "일기",
            "placeholder": "오늘 하루는 어땠나요?",
        },
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

for category in CATEGORIES:
    category["labels"] = {**DEFAULT_LABELS, **category.get("labels", {})}

# slug 로 카테고리를 바로 찾기 위한 사전 (예: CATEGORY_MAP["diary"])
CATEGORY_MAP = {category["slug"]: category for category in CATEGORIES}
