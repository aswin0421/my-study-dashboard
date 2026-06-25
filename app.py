from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# 1. 음식 데이터베이스 (임시 데이터)

FOOD_DATA = [
    {"name": "떡볶이", "tags": ["매운맛", "분식"]},
    {"name": "라볶이", "tags": ["매운맛", "분식", "면"]},
    {"name": "김치찌개", "tags": ["매운맛", "국물", "밥"]},
    {"name": "제육볶음", "tags": ["매운맛", "고기", "밥"]},
    {"name": "돈까스", "tags": ["고기", "밥", "튀김"]},
    {"name": "잔치국수", "tags": ["국물", "면", "안매운맛"]},
    {"name": "순대", "tags": ["분식", "고기"]}
]


@app.route('/')
def home():
    return render_template('index.html')


# 2. 추천 결과를 반환하는 API 엔드포인트
@app.route('/recommend', methods=['POST'])
def recommend():
    # 프론트엔드(JS)에서 보낸 선택된 카테고리 데이터를 받습니다.
    data = request.get_json()
    selected_categories = data.get('categories', [])

    recommended_foods = []

    # 📌 3. 교집합 필터링 로직
    for food in FOOD_DATA:
        # 사용자가 선택한 카테고리가 음식의 태그에 "모두" 포함되어 있는지 확인합니다.
        if all(category in food["tags"] for category in selected_categories):
            recommended_foods.append(food["name"])

    # 결과를 JSON 형태로 변환하여 자바스크립트로 돌려보냅니다.
    return jsonify({"results": recommended_foods})


if __name__ == '__main__':
    app.run(debug=True)