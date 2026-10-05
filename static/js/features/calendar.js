import { supabase } from '../lib/supabase.js';
import { isOwner } from '../lib/auth.js';
import { toast } from '../lib/toast.js';
import { el } from '../lib/utils.js';

// ==========================================
// 메인 캘린더 (Supabase calendar 테이블)
// ==========================================

// 메모 저장 키 — 기존 데이터와 호환되도록 월은 0부터 시작하는 형식 유지
// (2026년 10월 6일 → memo_2026_9_6)
const memoKey = (year, month, day) => `memo_${year}_${month}_${day}`;

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function initCalendar() {
    const grid = document.getElementById('calendar-days');
    if (!grid) return;

    const monthLabel = document.getElementById('month-year');
    const todayLabel = document.getElementById('today-label');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');

    const dialog = document.getElementById('memo-dialog');
    const dialogTitle = document.getElementById('memo-dialog-title');
    const memoInput = document.getElementById('memo-input');
    const saveBtn = document.getElementById('save-memo-btn');
    const deleteBtn = document.getElementById('delete-memo-btn');

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let memos = {};          // 지금 보이는 달의 메모 { 'memo_2026_9_6': '내용' }
    let editingKey = null;   // 팝업에서 수정 중인 날짜 키
    let renderId = 0;        // 달 이동 연타 시 늦게 온 옛날 응답을 버리기 위한 번호표

    if (todayLabel) {
        todayLabel.textContent = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()} (${WEEKDAY_NAMES[now.getDay()]})`;
    }

    // 한 달치 메모를 요청 한 번으로 불러오기
    async function loadMonth(y, m, daysInMonth) {
        if (!supabase) return {};

        const keys = [];
        for (let d = 1; d <= daysInMonth; d++) keys.push(memoKey(y, m, d));

        const { data, error } = await supabase
            .from('calendar')
            .select('event_date, content')
            .in('event_date', keys);

        if (error) {
            console.error('캘린더 로드 에러:', error);
            toast('캘린더를 불러오지 못했습니다.', 'error');
            return {};
        }
        return Object.fromEntries((data || []).map(row => [row.event_date, row.content]));
    }

    async function render() {
        const id = ++renderId;
        const y = year;
        const m = month;
        const firstDay = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        const loaded = await loadMonth(y, m, daysInMonth);
        if (id !== renderId) return; // 기다리는 사이 다른 달로 이동했으면 이 결과는 버림
        memos = loaded;

        monthLabel.textContent = `${y}년 ${m + 1}월`;

        const today = new Date();
        const cells = [];

        for (let i = 0; i < firstDay; i++) {
            cells.push(el('div', { className: 'day is-blank', 'aria-hidden': 'true' }));
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const memo = memos[memoKey(y, m, d)] || '';
            const weekday = (firstDay + d - 1) % 7;
            const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();

            const classes = ['day'];
            if (isToday) classes.push('is-today');
            if (memo) classes.push('has-memo');
            if (weekday === 0) classes.push('is-sun');
            if (weekday === 6) classes.push('is-sat');

            cells.push(el('button', {
                type: 'button',
                className: classes.join(' '),
                onClick: () => openMemo(y, m, d),
            }, [
                el('span', { className: 'day-num', text: d }),
                memo ? el('span', { className: 'day-memo', text: memo }) : null,
            ]));
        }

        grid.replaceChildren(...cells);
    }

    function openMemo(y, m, d) {
        const key = memoKey(y, m, d);
        const memo = memos[key] || '';
        if (!isOwner() && !memo) return; // 방문자는 일정이 있는 날만 열어볼 수 있음

        editingKey = key;
        dialogTitle.textContent = `${y}년 ${m + 1}월 ${d}일 일정`;
        memoInput.value = memo;
        memoInput.readOnly = !isOwner(); // 방문자는 읽기만 가능
        deleteBtn.hidden = !memo;        // 지울 일정이 있을 때만 삭제 버튼
        dialog.showModal();
        if (isOwner()) memoInput.focus();
    }

    saveBtn.addEventListener('click', async () => {
        if (!editingKey || !supabase) return;
        const text = memoInput.value.trim();

        // 내용을 다 지우고 저장하면 일정 삭제로 처리
        const { error } = text
            ? await supabase.from('calendar').upsert({ event_date: editingKey, content: text })
            : await supabase.from('calendar').delete().eq('event_date', editingKey);

        if (error) {
            toast(`저장 실패: ${error.message}`, 'error');
            return;
        }
        dialog.close();
        toast('일정을 저장했습니다.', 'success');
        render();
    });

    deleteBtn.addEventListener('click', async () => {
        if (!editingKey || !supabase) return;
        if (!confirm('이 날의 일정을 삭제하시겠습니까?')) return;

        const { error } = await supabase.from('calendar').delete().eq('event_date', editingKey);
        if (error) {
            toast(`삭제 실패: ${error.message}`, 'error');
            return;
        }
        dialog.close();
        toast('일정을 삭제했습니다.');
        render();
    });

    // Ctrl + Enter 로 바로 저장
    memoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && isOwner()) saveBtn.click();
    });

    function moveMonth(diff) {
        month += diff;
        if (month < 0) { month = 11; year--; }
        if (month > 11) { month = 0; year++; }
        render();
    }

    prevBtn.addEventListener('click', () => moveMonth(-1));
    nextBtn.addEventListener('click', () => moveMonth(1));
    todayBtn.addEventListener('click', () => {
        const t = new Date();
        year = t.getFullYear();
        month = t.getMonth();
        render();
    });

    monthLabel.textContent = `${year}년 ${month + 1}월`; // 첫 데이터가 오기 전에도 제목은 바로 보이게
    render();
}
