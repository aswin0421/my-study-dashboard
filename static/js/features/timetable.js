import { supabase } from '../lib/supabase.js';
import { isOwner, onOwnerChange } from '../lib/auth.js';
import { toast } from '../lib/toast.js';
import { el } from '../lib/utils.js';

// ==========================================
// 학교 시간표 (Supabase timetable 테이블)
// ==========================================
//  weekday    : 1=월 2=화 3=수 4=목 5=금 6=토 7=일
//  start_time : '09:00:00' 형식 (end_time 도 같음)
//
//  initTodayClasses() : 메인 페이지 '오늘 수업' 카드
//  initTimetable()    : 시간표 페이지 주간 표 + (로그인 시) 수업 추가·수정·삭제

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

// 과목별 색 — 과목 이름 가나다순으로 하나씩 배정 (같은 과목은 항상 같은 색)
const COLORS = ['#ff5c5c', '#ffb547', '#4ade80', '#60a5fa', '#c084fc', '#f472b6', '#2dd4bf', '#facc15', '#a3a3a3'];

const REFRESH_MS = 60 * 1000; // 1분마다 '수업 중' 표시·현재 시각 선 갱신

/** '09:30:00' → 570 (자정부터 몇 분) */
const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};
/** '09:30:00' → '09:30' */
const hhmm = (t) => t.slice(0, 5);
/** 오늘 요일 번호 (1=월 ... 7=일) */
const todayWeekday = () => new Date().getDay() || 7;
const nowMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
};

async function loadClasses() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('timetable')
        .select('*')
        .order('weekday')
        .order('start_time');

    if (error) {
        console.error('시간표 불러오기 에러:', error);
        const missing = error.code === 'PGRST205' || error.code === '42P01';
        toast(missing ? '시간표 테이블이 없습니다. supabase/timetable.sql 을 실행하세요.' : '시간표를 불러오지 못했습니다.', 'error');
        return [];
    }
    return data || [];
}

function colorMap(classes) {
    const subjects = [...new Set(classes.map(c => c.subject))].sort((a, b) => a.localeCompare(b, 'ko'));
    return Object.fromEntries(subjects.map((subject, i) => [subject, COLORS[i % COLORS.length]]));
}

// ------------------------------------------
// 메인 페이지: 오늘 수업 카드
// ------------------------------------------
export function initTodayClasses() {
    const list = document.getElementById('today-class-list');
    if (!list) return;
    const emptyText = document.getElementById('today-class-empty');

    let classes = [];

    function render() {
        const now = nowMinutes();
        const colors = colorMap(classes);
        const todays = classes.filter(c => c.weekday === todayWeekday());
        const next = todays.find(c => toMinutes(c.start_time) > now);

        emptyText.hidden = todays.length > 0;
        list.replaceChildren(...todays.map(c => {
            const start = toMinutes(c.start_time);
            const end = toMinutes(c.end_time);
            const status = now >= end ? 'done' : now >= start ? 'now' : c === next ? 'next' : '';

            const item = el('li', { className: status ? `today-class is-${status}` : 'today-class' }, [
                el('div', { className: 'today-class-body' }, [
                    el('span', { className: 'today-class-time', text: `${hhmm(c.start_time)} – ${hhmm(c.end_time)}` }),
                    el('span', { className: 'today-class-subject', text: c.subject }),
                    c.room ? el('span', { className: 'today-class-room', text: c.room }) : null,
                ]),
                status === 'now' ? el('span', { className: 'pill is-accent', text: '수업 중' }) : null,
                status === 'next' ? el('span', { className: 'pill', text: '다음 수업' }) : null,
            ]);
            item.style.setProperty('--c', colors[c.subject]);
            return item;
        }));
    }

    loadClasses().then(data => {
        classes = data;
        render();
        setInterval(render, REFRESH_MS);
    });
}

// ------------------------------------------
// 시간표 페이지: 주간 표
// ------------------------------------------
export function initTimetable() {
    const root = document.getElementById('timetable');
    if (!root) return;

    const emptyText = document.getElementById('timetable-empty');
    const addBtn = document.getElementById('add-class-btn');

    const dialog = document.getElementById('class-dialog');
    const form = document.getElementById('class-form');
    const dialogTitle = document.getElementById('class-dialog-title');
    const subjectInput = document.getElementById('class-subject');
    const professorInput = document.getElementById('class-professor');
    const roomInput = document.getElementById('class-room');
    const weekdayInput = document.getElementById('class-weekday');
    const startInput = document.getElementById('class-start');
    const endInput = document.getElementById('class-end');
    const errorText = document.getElementById('class-error');
    const deleteBtn = document.getElementById('delete-class-btn');

    let classes = [];
    let loaded = false;
    let editing = null; // 수정 중인 수업 (null 이면 새 수업 추가)

    async function load() {
        classes = await loadClasses();
        loaded = true;
        render();
    }

    function render() {
        const owner = isOwner();
        const colors = colorMap(classes);
        const today = todayWeekday();

        // 월~금은 항상, 토·일은 수업이 있을 때만 표시
        const days = [1, 2, 3, 4, 5];
        if (classes.some(c => c.weekday === 6)) days.push(6);
        if (classes.some(c => c.weekday === 7)) days.push(7);

        // 표의 시간 범위: 가장 이른 수업 ~ 가장 늦은 수업 (최소 9시부터 8칸)
        const starts = classes.map(c => toMinutes(c.start_time));
        const ends = classes.map(c => toMinutes(c.end_time));
        const startHour = Math.min(9, ...starts.map(m => Math.floor(m / 60)));
        const endHour = Math.max(startHour + 8, ...ends.map(m => Math.ceil(m / 60)));
        const total = (endHour - startHour) * 60;
        const position = (minutes) => ((minutes - startHour * 60) / total) * 100; // 표 위에서부터 몇 %

        const head = el('div', { className: 'tt-head' }, [
            el('span'),
            ...days.map(d => el('span', { className: d === today ? 'tt-day is-today' : 'tt-day', text: DAY_NAMES[d - 1] })),
        ]);

        const hours = [];
        for (let h = startHour; h < endHour; h++) hours.push(el('span', { text: `${h}시` }));
        const timeLabels = el('div', { className: 'tt-times' }, hours);

        const columns = days.map(d => {
            const column = el('div', { className: d === today ? 'tt-col is-today' : 'tt-col' });

            classes.filter(c => c.weekday === d).forEach(c => {
                const start = toMinutes(c.start_time);
                const end = toMinutes(c.end_time);
                const info = [c.subject, `${DAY_NAMES[d - 1]} ${hhmm(c.start_time)}–${hhmm(c.end_time)}`, c.room, c.professor].filter(Boolean);

                // 로그인했을 때만 눌러서 수정할 수 있는 버튼, 방문자에게는 그냥 칸
                const block = el(owner ? 'button' : 'div', {
                    type: owner ? 'button' : null,
                    className: 'tt-block',
                    title: info.join('\n'),
                    onClick: owner ? () => openDialog(c) : null,
                }, [
                    el('span', { className: 'tt-subject', text: c.subject }),
                    c.room ? el('span', { className: 'tt-room', text: c.room }) : null,
                    c.professor ? el('span', { className: 'tt-prof', text: c.professor }) : null,
                ]);
                block.style.top = `calc(${position(start)}% + 2px)`;
                block.style.height = `calc(${position(end) - position(start)}% - 4px)`;
                block.style.setProperty('--c', colors[c.subject]);
                column.append(block);
            });

            // 오늘 칸에 현재 시각 빨간 선
            const now = nowMinutes();
            if (d === today && now > startHour * 60 && now < endHour * 60) {
                const line = el('div', { className: 'tt-now', 'aria-hidden': 'true' });
                line.style.top = `${position(now)}%`;
                column.append(line);
            }
            return column;
        });

        const body = el('div', { className: 'tt-body' }, [timeLabels, ...columns]);
        body.style.setProperty('--hours', endHour - startHour);
        root.style.setProperty('--days', days.length);
        root.replaceChildren(head, body);

        emptyText.hidden = !loaded || classes.length > 0;
    }

    // ---------- 수업 추가·수정 팝업 (로그인했을 때만) ----------
    function openDialog(cls) {
        editing = cls;
        dialogTitle.textContent = cls ? '수업 수정' : '수업 추가';
        subjectInput.value = cls ? cls.subject : '';
        professorInput.value = cls ? cls.professor || '' : '';
        roomInput.value = cls ? cls.room || '' : '';
        weekdayInput.value = String(cls ? cls.weekday : Math.min(todayWeekday(), 5));
        startInput.value = cls ? hhmm(cls.start_time) : '09:00';
        endInput.value = cls ? hhmm(cls.end_time) : '10:00';
        deleteBtn.hidden = !cls;
        errorText.textContent = '';
        dialog.showModal();
        subjectInput.focus();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!supabase) return;

        const row = {
            subject: subjectInput.value.trim(),
            professor: professorInput.value.trim() || null,
            room: roomInput.value.trim() || null,
            weekday: Number(weekdayInput.value),
            start_time: startInput.value,
            end_time: endInput.value,
        };

        if (!row.subject) {
            errorText.textContent = '과목명을 입력하세요.';
            return;
        }
        if (!row.start_time || !row.end_time || row.end_time <= row.start_time) {
            errorText.textContent = '끝나는 시간은 시작 시간보다 늦어야 해요.';
            return;
        }

        const query = editing
            ? supabase.from('timetable').update(row).eq('id', editing.id)
            : supabase.from('timetable').insert(row);
        const { data, error } = await query.select('id');

        if (error) {
            errorText.textContent = `저장 실패: ${error.message}`;
            return;
        }
        // 권한이 없으면 에러 없이 0건으로 끝나므로 결과 개수로 확인
        if (!data || data.length === 0) {
            errorText.textContent = '저장 권한이 없습니다. 로그인 상태를 확인하세요.';
            return;
        }

        dialog.close();
        toast(editing ? '수업을 수정했습니다.' : '수업을 추가했습니다.', 'success');
        load();
    });

    deleteBtn.addEventListener('click', async () => {
        if (!editing || !confirm(`'${editing.subject}' 수업을 삭제하시겠습니까?`)) return;

        const { error } = await supabase.from('timetable').delete().eq('id', editing.id);
        if (error) {
            errorText.textContent = `삭제 실패: ${error.message}`;
            return;
        }
        dialog.close();
        toast('수업을 삭제했습니다.');
        load();
    });

    addBtn.addEventListener('click', () => openDialog(null));

    onOwnerChange(render); // 로그인/로그아웃 시 칸을 누를 수 있는지 갱신
    setInterval(render, REFRESH_MS);
    load();
}
