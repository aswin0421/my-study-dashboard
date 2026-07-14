document.addEventListener('DOMContentLoaded', () => {
    // === [1] 카드 클릭 알림창 및 페이지 이동 ===
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            // 💡 1. 카드에 숨겨진 data-url 값을 가져옵니다.
            const targetUrl = card.getAttribute('data-url');

            // 💡 2. 만약 목적지 주소가 적혀있다면 거기로 이동!
            if (targetUrl) {
                window.location.href = targetUrl;
            }
            // 💡 3. 목적지가 없는 카드(아직 준비 중인 카드)라면 기존처럼 알림 띄우기
            else {
                const title = card.querySelector('h2').innerText;
                alert(`[${title}] 기록을 엽니다.\n(상세 페이지 준비 중!)`);
            }
        });
    });

    // === [2] 캘린더 및 모달 기능 ===
    const monthYear = document.getElementById('month-year');
    const calendarDays = document.getElementById('calendar-days');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    // 모달 관련 요소들 가져오기
    const modal = document.getElementById('memo-modal');
    const modalTitle = document.getElementById('modal-date-title');
    const memoInput = document.getElementById('memo-input');
    const saveBtn = document.getElementById('save-memo-btn');
    const deleteBtn = document.getElementById('delete-memo-btn');
    const closeBtn = document.getElementById('close-modal-btn');

    let date = new Date();
    let currentMonth = date.getMonth();
    let currentYear = date.getFullYear();

    // 현재 수정 중인 날짜의 정보를 임시로 저장할 변수
    let currentEditingKey = null;
    let currentEditingMonth = null;
    let currentEditingYear = null;

    function renderCalendar(month, year) {
        if (!calendarDays || !monthYear) return;
        calendarDays.innerHTML = '';
        const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
        monthYear.innerText = `${year}년 ${months[month]}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.border = "none";
            emptyDiv.style.backgroundColor = "transparent";
            emptyDiv.style.cursor = "default";
            calendarDays.appendChild(emptyDiv);
        }

        const today = new Date();

        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            const dayNum = document.createElement('span');
            dayNum.classList.add('day-number');
            dayNum.innerText = i;
            dayDiv.appendChild(dayNum);

            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('today');
            }

            const memoKey = `memo_${year}_${month}_${i}`;
            const savedMemo = localStorage.getItem(memoKey);

            if (savedMemo) {
                const memoDot = document.createElement('span');
                memoDot.classList.add('memo-dot');
                dayDiv.appendChild(memoDot);
            }

            // 💡 기존의 prompt() 대신 커스텀 모달 창을 띄우는 이벤트
            dayDiv.addEventListener('click', () => {
                if(!modal || !modalTitle || !memoInput) return;
                currentEditingKey = memoKey;
                currentEditingMonth = month;
                currentEditingYear = year;

                modalTitle.innerText = `${year}년 ${month + 1}월 ${i}일 일정`;
                memoInput.value = savedMemo || ""; // 기존 메모가 있으면 텍스트 창에 채워넣기

                modal.classList.remove('hidden'); // 모달 창 보이기
                memoInput.focus(); // 텍스트 창에 바로 키보드 입력이 가능하게 포커스 맞추기
            });

            calendarDays.appendChild(dayDiv);
        }
    }

    renderCalendar(currentMonth, currentYear);

    // 이전 달 / 다음 달 버튼
   if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            renderCalendar(currentMonth, currentYear);
        });
    }
   if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar(currentMonth, currentYear);
        });
    }

    // === [3] 모달 창 내부 버튼 동작 설정 ===

    // 취소 버튼
    function closeModal() {
        if (modal) modal.classList.add('hidden');
        currentEditingKey = null;
    }
    if (closeBtn){
    closeBtn.addEventListener('click', closeModal);
    }
    // 저장 버튼
    if (saveBtn) { // 안전장치
        saveBtn.addEventListener('click', () => {
            if (currentEditingKey && memoInput) {
                const text = memoInput.value.trim();
                if (text === "") {
                    localStorage.removeItem(currentEditingKey);
                } else {
                    localStorage.setItem(currentEditingKey, text);
                }
                renderCalendar(currentEditingMonth, currentEditingYear);
                closeModal();
            }
        });
    }

    // 삭제 버튼
    if (deleteBtn) { // 안전장치
        deleteBtn.addEventListener('click', () => {
            if (currentEditingKey) {
                localStorage.removeItem(currentEditingKey);
                renderCalendar(currentEditingMonth, currentEditingYear);
                closeModal();
            }
        });
    }
    // === [3] 스포티파이 API 실시간 연동 및 동기화 로직 ===
    const spotifyCover = document.getElementById('spotify-cover');
    const spotifyTitle = document.getElementById('spotify-title');
    const spotifyArtist = document.getElementById('spotify-artist');
    const spotifyWidget = document.getElementById('spotify-widget');
// 💡 추가된 모달 관련 요소들
    const spotifyModal = document.getElementById('spotify-modal');
    const closeSpotifyBtn = document.getElementById('close-spotify-btn');
    const modalCover = document.getElementById('modal-spotify-cover');
    const spotifyModalTitle = document.getElementById('modal-spotify-title');
    const modalArtist = document.getElementById('modal-spotify-artist');
    const modalAlbum = document.getElementById('modal-spotify-album');
    const modalLink = document.getElementById('modal-spotify-link');

    // 모달 닫기 이벤트
  // 💡 수정 후: 버튼이 있는지 먼저 확인(if)하는 방어막 추가
    if (closeSpotifyBtn && spotifyModal) {
        closeSpotifyBtn.addEventListener('click', () => {
            spotifyModal.classList.add('hidden');
        });
    }


    function updateSpotifyStatus() {
        if(!spotifyWidget) return;
        fetch('/api/spotify')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'need_auth') {
                    // 1. 최초 실행 시 로그인이 안 되어 있는 경우 (위젯 클릭 유도)
                    spotifyCover.innerHTML = '🔒';
                    spotifyTitle.innerText = '스포티파이 연동 필요';
                    spotifyArtist.innerText = '클릭하여 계정 로그인';
                    spotifyWidget.style.cursor = 'pointer';

                    // 위젯 클릭 시 파이썬이 보내준 스포티파이 공식 로그인창 띄우기
                    spotifyWidget.onclick = () => {
                        window.open(data.auth_url, '_blank');
                    };
                } else if (data.status === 'playing') {
                    // 2. 실제 내 스마트폰이나 PC에서 노래가 흐르고 있는 상태
                    spotifyCover.innerHTML = `<img src="${data.cover}" class="spotify-cover-img" alt="Album Cover">`;

                    // CSS에서 말줄임표 처리를 하므로, 원본 데이터를 그대로 꽂아줍니다!
                    spotifyTitle.innerText = data.title;
                    spotifyArtist.innerText = data.artist;

                    // 💡 위젯 클릭 가능하게 변경
                    spotifyWidget.style.cursor = 'pointer';

                   // 💡 위젯을 클릭하면 모달 창에 데이터를 채워넣고 화면에 띄움
                    spotifyWidget.onclick = () => {
                        if (modalCover) modalCover.src = data.cover;

                        // 🎯 핵심 수정 부분: modalTitle을 spotifyModalTitle로 변경!
                        if (spotifyModalTitle) spotifyModalTitle.innerText = data.title;

                        if (modalArtist) modalArtist.innerText = data.artist;
                        if (modalAlbum) modalAlbum.innerText = data.album;
                        if (modalLink) modalLink.href = data.link;

                        if (spotifyModal) spotifyModal.classList.remove('hidden');
                    };
                } else {
                    // 3. 연동은 완료되었으나 음악이 멈춰있는 상태
                    spotifyCover.innerHTML = '🎵';
                    spotifyTitle.innerText = '재생 중인 곡 없음';
                    spotifyArtist.innerText = 'Spotify 쉼표';
                    spotifyWidget.style.cursor = 'default';
                    spotifyWidget.onclick = null;
                }
            })
            .catch(error => {
                console.error('Spotify 통신 에러:', error);
            });
    }

    // 대시보드가 켜지자마자 0.5초 뒤 첫 검사를 수행하고, 이후 10초마다 자동으로 백엔드에 물어봅니다.
    setTimeout(updateSpotifyStatus, 500);
    setInterval(updateSpotifyStatus, 5000);

    // ==========================================
    // === [5] 자격증 페이지: 투두 리스트 (계획) 기능 ===
    // ==========================================
    const todoInput = document.getElementById('todo-input');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoList = document.getElementById('todo-list');
    const todoDatePicker = document.getElementById('todo-date-picker');

   // 현재 열려있는 서랍장 이름표 (키)와 데이터 배열
    let currentTodoKey = '';
    let todos = [];

    // 💡 날짜가 바뀔 때마다 해당 날짜의 데이터를 불러오는 핵심 함수
    function loadTodosForDate(dateString) {
        // dateString은 "2026-07-09" 형태이므로 쪼개서 숫자로 만듭니다
        const parts = dateString.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);

        // 기존에 만들던 규칙(cert_todos_2026_7_9)과 똑같이 이름표를 붙입니다
        currentTodoKey = `cert_todos_${year}_${month}_${day}`;

        // 새 이름표로 서랍을 열고 화면에 그리기
        todos = JSON.parse(localStorage.getItem(currentTodoKey)) || [];
        renderTodos();
    }

    if (todoDatePicker) {
        // 1. 페이지를 처음 켰을 때는 '오늘' 날짜를 기본으로 세팅합니다.
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // 7 -> '07'
        const dd = String(today.getDate()).padStart(2, '0');      // 9 -> '09'
        const todayStr = `${yyyy}-${mm}-${dd}`;

        todoDatePicker.value = todayStr;
        loadTodosForDate(todayStr); // 오늘 데이터 불러오기

        // 2. 💡 달력에서 사용자가 날짜를 변경하면? 즉시 그 날짜 데이터로 교체!
        todoDatePicker.addEventListener('change', (e) => {
            loadTodosForDate(e.target.value);
        });
    }

    // 할 일 목록을 로컬 스토리지에 저장하는 함수 (현재 열려있는 서랍장에 저장)
    function saveTodos() {
        if (currentTodoKey) {
            localStorage.setItem(currentTodoKey, JSON.stringify(todos));
        }
    }

    // 3. 화면에 할 일 목록을 그려주는 함수
    function renderTodos() {
        if (!todoList) return; // 자격증 페이지가 아니면 실행 안 함

        todoList.innerHTML = ''; // 기존 뼈대 HTML 비우기

        todos.forEach((todo, index) => {
            const li = document.createElement('li');

            // 체크박스 생성
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `todo-${index}`;
            checkbox.checked = todo.completed; // 저장된 체크 상태 반영

            // 체크박스를 누를 때마다 상태 저장 및 새로고침
            checkbox.addEventListener('change', () => {
                todos[index].completed = checkbox.checked;
                saveTodos();
                renderTodos();
            });

            // 할 일 텍스트 생성
            const label = document.createElement('label');
            label.htmlFor = `todo-${index}`;
            label.innerText = todo.text;

            // 삭제 버튼(×) 생성
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.innerText = '×';

            // 삭제 버튼 누르면 배열에서 빼고 저장 후 새로고침
            deleteBtn.addEventListener('click', () => {
                todos.splice(index, 1);
                saveTodos();
                renderTodos();
            });

            // 조립해서 화면에 붙이기
            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });
    }

    // 4. 새로운 할 일 추가 함수
    function addTodo() {
        const text = todoInput.value.trim();
        if (text === '') return; // 빈칸이면 무시

        // 배열에 새 데이터 넣고, 저장하고, 화면 다시 그리기
        todos.push({ text: text, completed: false });
        saveTodos();
        todoInput.value = ''; // 입력창 비우기
        renderTodos();
    }

    // 5. 버튼 클릭 및 엔터키 이벤트 연결 (방어막 적용)
    if (addTodoBtn && todoInput) {
        addTodoBtn.addEventListener('click', addTodo);
        // 마우스 클릭 말고 키보드 엔터(Enter)를 쳐도 입력되게 설정
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTodo();
        });

        // 페이지 켜지자마자 저장된 목록 그리기
        renderTodos();
    }

    // ==========================================
    // === [6] 자격증 페이지: 파일 첨부 이름 표시 기능 ===
    // ==========================================
    const imageUpload = document.getElementById('image-upload');
    const fileUpload = document.getElementById('file-upload');
    const fileInfoText = document.getElementById('attached-file-info');

    function updateFileInfo() {
        if (!fileInfoText) return;

        let infoMessage = [];

        // 사진 파일이 선택되었는지 확인
        if (imageUpload && imageUpload.files.length > 0) {
            infoMessage.push(`📷 ${imageUpload.files[0].name}`);
        }
        // 일반 자료 파일이 선택되었는지 확인
        if (fileUpload && fileUpload.files.length > 0) {
            infoMessage.push(`📁 ${fileUpload.files[0].name}`);
        }

        // 화면에 글씨 업데이트
        if (infoMessage.length > 0) {
            fileInfoText.innerText = infoMessage.join('  /  ');
            fileInfoText.style.color = '#ff3b3b'; // 파일이 첨부되면 빨간색으로 눈에 띄게
            fileInfoText.style.fontWeight = 'bold';
        } else {
            fileInfoText.innerText = '첨부된 파일이 없습니다.';
            fileInfoText.style.color = '#888';
            fileInfoText.style.fontWeight = 'normal';
        }
    }

    // 파일 선택창 내용이 바뀔 때마다 실행
    if (imageUpload) imageUpload.addEventListener('change', updateFileInfo);
    if (fileUpload) fileUpload.addEventListener('change', updateFileInfo);

    // ==========================================
    // === [7] 자격증 페이지: 일지 저장 및 불러오기 (임시) ===
    // ==========================================
    const logTitleInput = document.getElementById('log-title');
    const logContentInput = document.getElementById('log-content');
    const saveLogBtn = document.getElementById('save-log-btn');
    const savedLogList = document.querySelector('.saved-log-list');

    // 1. 브라우저에서 일지를 저장할 전용 보관함 이름
    const LOGS_KEY = 'certification_logs';
    let logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];

    // 2. 우측 리스트에 일지 목록을 그려주는 함수
    function renderLogs() {
        if (!savedLogList) return;

        logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];

        savedLogList.innerHTML = ''; // 뼈대 비우기

        // 💡 최신 글이 맨 위에 오도록 배열을 뒤집어서(reverse) 그려줍니다
        [...logs].reverse().forEach((log) => {
            const li = document.createElement('li');
            li.classList.add('log-item');
            li.style.position = 'relative'; //삭제버튼 위치의 기준점

            const dateSpan = document.createElement('span');
            dateSpan.classList.add('log-date');
            dateSpan.innerText = log.date;

            const titleSpan = document.createElement('span');
            titleSpan.classList.add('log-title-text');
            titleSpan.innerText = log.title;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerText = 'x';
            deleteBtn.classList.add('log-delete-btn');

            deleteBtn.addEventListener('click',(e)=>{
                e.stopPropagation();

                if(confirm(`'${log.title}' 일지를 삭제하시겠습니까?`)){
                let currentLogs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
                currentLogs = currentLogs.filter(item => item.id !== log.id);
                localStorage.setItem(LOGS_KEY, JSON.stringify(currentLogs));
                renderLogs();
                }
                });

            li.appendChild(dateSpan);
            li.appendChild(titleSpan);
            li.appendChild(deleteBtn);

            // 🎯 핵심 기능: 리스트를 클릭하면 왼쪽 도화지에 내용 채우기!
            li.addEventListener('click', () => {
                logTitleInput.value = log.title;
                logContentInput.value = log.content;
                // (나중에 파이썬과 연동하면, 이때 첨부했던 파일도 불러오게 됩니다)
            });

            savedLogList.appendChild(li);
        });
    }

    // 3. '일지 저장하기' 버튼을 눌렀을 때의 동작
    if (saveLogBtn) {
        saveLogBtn.addEventListener('click', () => {
            const title = logTitleInput.value.trim();
            const content = logContentInput.value.trim();

            // 제목이 비어있으면 저장 안 함
            if (title === '') {
                alert('일지 제목을 입력해주세요!');
                return;
            }

            // 오늘 날짜 문자열 만들기 (예: 7/9)
            const today = new Date();
            const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;

            // 새로운 일지 데이터 포장
            const newLog = {
                id: Date.now(), // 겹치지 않는 고유 번호
                date: dateStr,
                title: title,
                content: content
            };

           let currentLogs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
            currentLogs.push(newLog);
            localStorage.setItem(LOGS_KEY, JSON.stringify(currentLogs));

            // 저장 후 입력창 깨끗하게 비우기
            logTitleInput.value = '';
            logContentInput.value = '';
            if (fileInfoText) {
                fileInfoText.innerText = '첨부된 파일이 없습니다.';
                fileInfoText.style.color = '#888';
                fileInfoText.style.fontWeight = 'normal';
            }

            // 리스트 새로고침
            renderLogs();
        });

        // 페이지가 처음 켜질 때 기존 목록 그려주기
        renderLogs();
    }
});
