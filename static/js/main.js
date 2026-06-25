document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.category-btn');
    const submitBtn = document.getElementById('submit-btn');
    const foodList = document.getElementById('food-list');
    const resultTitle = document.getElementById('result-title');

    // 💡 추가된 변수들
    const categoryArea = document.getElementById('category-area');
    const resultArea = document.getElementById('result-area');
    const resetBtn = document.getElementById('reset-btn');

    // 1. 버튼 클릭 시 활성화/비활성화
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
        });
    });

    // 2. '선택 완료' 버튼 클릭
    submitBtn.addEventListener('click', () => {
        const selectedCategories = Array.from(document.querySelectorAll('.category-btn.active'))
                                        .map(btn => btn.dataset.category);

        if (selectedCategories.length === 0) {
            alert("최소 1개 이상의 카테고리를 선택해 주세요!");
            return;
        }

        // 서버로 데이터 전송
        fetch('/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ categories: selectedCategories })
        })
        .then(response => response.json())
        .then(data => {
            const results = data.results;
            foodList.innerHTML = '';

            if (results.length > 0) {
                resultTitle.innerText = "✨ 추천 메뉴 완료! ✨";
                results.forEach(food => {
                    const li = document.createElement('li');
                    li.innerText = food;
                    foodList.appendChild(li);
                });
            } else {
                resultTitle.innerText = "😢 앗...";
                const li = document.createElement('li');
                li.innerText = "해당하는 조건의 음식이 아직 없어요.";
                foodList.appendChild(li);
            }

            // 💡 화면 전환 마술: 카테고리 영역은 숨기고, 결과 영역은 보여줍니다.
            categoryArea.classList.add('hidden');
            resultArea.classList.remove('hidden');
        })
        .catch(error => {
            console.error('Error:', error);
            alert("서버와 통신 중 오류가 발생했습니다.");
        });
    });

    // 💡 3. '다시 고르기' 버튼 클릭 시 기능
    resetBtn.addEventListener('click', () => {
        // 결과 영역을 다시 숨기고, 카테고리 영역을 보여줍니다.
        resultArea.classList.add('hidden');
        categoryArea.classList.remove('hidden');

        // (선택사항) 기존에 선택했던 버튼들을 초기화하고 싶다면 아래 주석을 푸세요!
        // buttons.forEach(btn => btn.classList.remove('active'));
    });
});