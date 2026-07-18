
document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // === [0] Supabase 클라우드 데이터베이스 초기화 ===
    // ==========================================
    let supabase = null;

    // 💡 [핵심 해결책] window.ENV (열쇠)가 존재하는 페이지에서만 수파베이스를 연결합니다!
    // 이렇게 하면 메인 페이지에서는 에러 없이 캘린더와 스포티파이로 넘어갑니다.
    if (window.ENV && window.ENV.SUPABASE_URL && window.supabase) {
        supabase = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_KEY);
    }

    // ==========================================
    // === [1] 카드 클릭 알림창 및 페이지 이동 ===
    // ==========================================
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const targetUrl = card.getAttribute('data-url');
            if (targetUrl) {
                window.location.href = targetUrl;
            } else {
                const title = card.querySelector('h2').innerText;
                alert(`[${title}] 기록을 엽니다.\n(상세 페이지 준비 중!)`);
            }
        });
    });

    // ==========================================
    // === [2] 캘린더 및 모달 기능 ===
    // ==========================================
    const monthYear = document.getElementById('month-year');
    const calendarDays = document.getElementById('calendar-days');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    const modal = document.getElementById('memo-modal');
    const modalTitle = document.getElementById('modal-date-title');
    const memoInput = document.getElementById('memo-input');
    const saveBtn = document.getElementById('save-memo-btn');
    const deleteBtn = document.getElementById('delete-memo-btn');
    const closeBtn = document.getElementById('close-modal-btn');

    let date = new Date();
    let currentMonth = date.getMonth();
    let currentYear = date.getFullYear();

    let currentEditingKey = null;
    let currentEditingMonth = null;
    let currentEditingYear = null;

    // 캘린더 데이터 불러오기 함수
    async function loadCalendarMemo(dateKey) {
        if (!supabase) {
            console.error("수파베이스가 연결되지 않았습니다.");
            return '';
        }

        try {
            const { data, error } = await supabase
                .from('calendar')
                .select('content')
                .eq('event_date', dateKey)
                .maybeSingle();

            if (error) throw error;
            return data ? data.content : '';
        } catch (err) {
            console.error("캘린더 로드 에러:", err);
            return '';
        }
    }

    async function renderCalendar(month, year) {
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
            const savedMemo = await loadCalendarMemo(memoKey);

            if (savedMemo) {
                const memoDot = document.createElement('span');
                memoDot.classList.add('memo-dot');
                dayDiv.appendChild(memoDot);
            }

            dayDiv.addEventListener('click', () => {
                if(!modal || !modalTitle || !memoInput) return;
                currentEditingKey = memoKey;
                currentEditingMonth = month;
                currentEditingYear = year;

                modalTitle.innerText = `${year}년 ${month + 1}월 ${i}일 일정`;
                memoInput.value = savedMemo || "";

                modal.classList.remove('hidden');
                memoInput.focus();
            });

            calendarDays.appendChild(dayDiv);
        }
    }

    renderCalendar(currentMonth, currentYear);

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
    async function closeModal() {
        if (modal) modal.classList.add('hidden');
        currentEditingKey = null;
    }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (currentEditingKey && memoInput) {
                const text = memoInput.value.trim();

                if (!supabase) {
                    alert("⚠️ 클라우드 연결이 확인되지 않아 저장할 수 없습니다.");
                    return;
                }

                // 클라우드(수파베이스)에 저장
                const { error } = await supabase
                    .from('calendar')
                    .upsert({ event_date: currentEditingKey, content: text });

                if (error) {
                    alert("❌ 달력 저장 실패: " + error.message);
                    return;
                }

                renderCalendar(currentEditingMonth, currentEditingYear);
                closeModal();
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (currentEditingKey) {
                if (!supabase) {
                    alert("⚠️ 클라우드 연결이 확인되지 않아 삭제할 수 없습니다.");
                    return;
                }

                // 클라우드(수파베이스)에서 데이터 삭제
                const { error } = await supabase
                    .from('calendar')
                    .delete()
                    .eq('event_date', currentEditingKey);

                if (error) {
                    alert("❌ 달력 삭제 실패: " + error.message);
                    return;
                }

                renderCalendar(currentEditingMonth, currentEditingYear);
                closeModal();
            }
        });
    }

    // ==========================================
    // === [4] 스포티파이 API 실시간 연동 로직 ===
    // ==========================================
    const spotifyCover = document.getElementById('spotify-cover');
    const spotifyTitle = document.getElementById('spotify-title');
    const spotifyArtist = document.getElementById('spotify-artist');
    const spotifyWidget = document.getElementById('spotify-widget');

    const spotifyModal = document.getElementById('spotify-modal');
    const closeSpotifyBtn = document.getElementById('close-spotify-btn');
    const modalCover = document.getElementById('modal-spotify-cover');
    const spotifyModalTitle = document.getElementById('modal-spotify-title');
    const modalArtist = document.getElementById('modal-spotify-artist');
    const modalAlbum = document.getElementById('modal-spotify-album');
    const modalLink = document.getElementById('modal-spotify-link');

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
                    spotifyCover.innerHTML = '🔒';
                    spotifyTitle.innerText = '스포티파이 연동 필요';
                    spotifyArtist.innerText = '클릭하여 계정 로그인';
                    spotifyWidget.style.cursor = 'pointer';
                    spotifyWidget.onclick = () => window.open(data.auth_url, '_blank');
                } else if (data.status === 'playing') {
                    spotifyCover.innerHTML = `<img src="${data.cover}" class="spotify-cover-img" alt="Album Cover">`;
                    spotifyTitle.innerText = data.title;
                    spotifyArtist.innerText = data.artist;
                    spotifyWidget.style.cursor = 'pointer';
                    spotifyWidget.onclick = () => {
                        if (modalCover) modalCover.src = data.cover;
                        if (spotifyModalTitle) spotifyModalTitle.innerText = data.title;
                        if (modalArtist) modalArtist.innerText = data.artist;
                        if (modalAlbum) modalAlbum.innerText = data.album;
                        if (modalLink) modalLink.href = data.link;
                        if (spotifyModal) spotifyModal.classList.remove('hidden');
                    };
                } else {
                    spotifyCover.innerHTML = '🎵';
                    spotifyTitle.innerText = '재생 중인 곡 없음';
                    spotifyArtist.innerText = 'Spotify 쉼표';
                    spotifyWidget.style.cursor = 'default';
                    spotifyWidget.onclick = null;
                }
            })
            .catch(error => console.error('Spotify 통신 에러:', error));
    }

    setTimeout(updateSpotifyStatus, 500);
    setInterval(updateSpotifyStatus, 5000);

    // ==========================================
    // === [5] 자격증 페이지: 투두 리스트 (Supabase 연동) ===
    // ==========================================
    const todoInput = document.getElementById('todo-input');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoList = document.getElementById('todo-list');
    const todoDatePicker = document.getElementById('todo-date-picker');

    let currentDateStr = '';
    let todos = [];

    async function loadTodosForDate(dateString) {
        if (!supabase) return; // 수파베이스가 연결 안 되어있으면 중단
        currentDateStr = dateString;

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('todo_date', currentDateStr)
            .order('id', { ascending: true });

        if (error) {
            console.error('Todo 불러오기 에러:', error);
            return;
        }
        todos = data || [];
        renderTodos();
    }

    if (todoDatePicker) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        todoDatePicker.value = todayStr;
        loadTodosForDate(todayStr);

        todoDatePicker.addEventListener('change', (e) => {
            loadTodosForDate(e.target.value);
        });
    }

    function renderTodos() {
        if (!todoList) return;
        todoList.innerHTML = '';

        todos.forEach((todo) => {
            const li = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `todo-${todo.id}`;
            checkbox.checked = todo.completed;

            checkbox.addEventListener('change', async () => {
                if(supabase) {
                    await supabase.from('todos').update({ completed: checkbox.checked }).eq('id', todo.id);
                }
            });

            const label = document.createElement('label');
            label.htmlFor = `todo-${todo.id}`;
            label.innerText = todo.task_text;

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.innerText = '×';

            deleteBtn.addEventListener('click', async () => {
                if(supabase) {
                    await supabase.from('todos').delete().eq('id', todo.id);
                    loadTodosForDate(currentDateStr);
                }
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });
    }

    async function addTodo() {
        const text = todoInput.value.trim();
        if (text === '' || !supabase) return;

        const { error } = await supabase
            .from('todos')
            .insert([{ todo_date: currentDateStr, task_text: text, completed: false }]);

        if (error) {
            console.error('Todo 추가 에러:', error);
            return;
        }

        todoInput.value = '';
        loadTodosForDate(currentDateStr);
    }

    if (addTodoBtn && todoInput) {
        addTodoBtn.addEventListener('click', addTodo);
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTodo();
        });
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
        if (imageUpload && imageUpload.files.length > 0) infoMessage.push(`📷 ${imageUpload.files[0].name}`);
        if (fileUpload && fileUpload.files.length > 0) infoMessage.push(`📁 ${fileUpload.files[0].name}`);

        if (infoMessage.length > 0) {
            fileInfoText.innerText = infoMessage.join('  /  ');
            fileInfoText.style.color = '#ff3b3b';
            fileInfoText.style.fontWeight = 'bold';
        } else {
            fileInfoText.innerText = '첨부된 파일이 없습니다.';
            fileInfoText.style.color = '#888';
            fileInfoText.style.fontWeight = 'normal';
        }
    }

    if (imageUpload) imageUpload.addEventListener('change', updateFileInfo);
    if (fileUpload) fileUpload.addEventListener('change', updateFileInfo);

    // ==========================================
    // === [7] 자격증 페이지: 일지 저장 및 불러오기 (Supabase 연동) ===
    // ==========================================
    const logTitleInput = document.getElementById('log-title');
    const logContentInput = document.getElementById('log-content');
    const saveLogBtn = document.getElementById('save-log-btn');
    const savedLogList = document.querySelector('.saved-log-list');

    async function renderLogs() {
        if (!savedLogList || !supabase) return;

        const { data: logs, error } = await supabase
            .from('logs')
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            console.error('일지 불러오기 에러:', error);
            return;
        }

        savedLogList.innerHTML = '';

        logs.forEach((log) => {
            const li = document.createElement('li');
            li.classList.add('log-item');
            li.style.position = 'relative';

            const dateSpan = document.createElement('span');
            dateSpan.classList.add('log-date');
            dateSpan.innerText = log.log_date;

            const titleSpan = document.createElement('span');
            titleSpan.classList.add('log-title-text');
            titleSpan.innerText = log.title;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerText = '×';
            deleteBtn.classList.add('log-delete-btn');

            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`'${log.title}' 일지를 삭제하시겠습니까?`)) {
                    await supabase.from('logs').delete().eq('id', log.id);
                    renderLogs();
                }
            });

            li.appendChild(dateSpan);
            li.appendChild(titleSpan);
            li.appendChild(deleteBtn);

            li.addEventListener('click', () => {
                logTitleInput.value = log.title;
                logContentInput.value = log.content;
            });

            savedLogList.appendChild(li);
        });
    }

    // [일지 저장 버튼 작동 로직]
    if (saveLogBtn) {
        saveLogBtn.addEventListener('click', async () => {
            const title = logTitleInput.value.trim();
            const content = logContentInput.value.trim();

            if (title === '') {
                alert('일지 제목을 입력해주세요!');
                return;
            }

            const today = new Date();
            const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;

            try {
                // 1. 수파베이스로 데이터 전송
                const { error } = await supabase
                    .from('logs')
                    .insert([
                        { log_date: dateStr, title: title, content: content }
                    ]);

                // 2. 수파베이스가 저장을 거부했을 경우 (원인 즉시 파악)
                if (error) {
                    alert(`수파베이스 저장 실패!\n원인: ${error.message}`);
                    console.error("저장 에러 상세:", error);
                    return; // 에러가 났으니 여기서 멈춤
                }

                // 3. 저장이 성공했을 경우
                logTitleInput.value = '';
                logContentInput.value = '';
                alert('일지가 성공적으로 저장되었습니다!');

                // 4. 화면 오른쪽 리스트를 다시 그려주는 함수 실행
                if (typeof renderLogs === 'function') {
                    renderLogs();
                }

            } catch (err) {
                alert(`알 수 없는 통신 오류 발생!\n원인: ${err.message}`);
            }
        });
    }
});