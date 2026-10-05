import { supabase } from '../lib/supabase.js';
import { isOwner, onOwnerChange } from '../lib/auth.js';
import { toast } from '../lib/toast.js';
import { el, formatDate } from '../lib/utils.js';

// ==========================================
// 카테고리 페이지: 날짜별 Todo (Supabase todos 테이블)
// ==========================================
export function initTodos(category) {
    const list = document.getElementById('todo-list');
    if (!list) return;

    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const datePicker = document.getElementById('todo-date-picker');
    const progressText = document.getElementById('todo-progress');
    const progressBar = document.getElementById('todo-progress-bar');
    const emptyText = document.getElementById('todo-empty');

    let date = formatDate(new Date());
    let todos = [];
    let loadId = 0; // 날짜를 빠르게 바꿨을 때 늦게 온 옛날 응답을 버리기 위한 번호표

    async function load() {
        if (!supabase) return;
        const id = ++loadId;

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('category', category)
            .eq('todo_date', date)
            .order('id', { ascending: true });

        if (id !== loadId) return;
        if (error) {
            console.error('Todo 불러오기 에러:', error);
            toast('Todo를 불러오지 못했습니다.', 'error');
            return;
        }
        todos = data || [];
        render();
    }

    function updateProgress() {
        const done = todos.filter(todo => todo.completed).length;
        progressText.textContent = `${done} / ${todos.length}`;
        progressBar.style.width = todos.length ? `${(done / todos.length) * 100}%` : '0%';
        emptyText.hidden = todos.length > 0;
    }

    function render() {
        const owner = isOwner();

        list.replaceChildren(...todos.map(todo => {
            const checkboxId = `todo-${todo.id}`;
            return el('li', { className: 'todo-item' }, [
                el('input', {
                    type: 'checkbox',
                    id: checkboxId,
                    checked: todo.completed,
                    disabled: !owner, // 방문자는 체크 불가
                    onChange: (e) => toggle(todo, e.target.checked),
                }),
                el('label', { htmlFor: checkboxId, text: todo.task_text }),
                el('button', {
                    type: 'button',
                    className: 'icon-btn icon-btn-sm todo-delete owner-only',
                    text: '×',
                    'aria-label': '할 일 삭제',
                    onClick: () => remove(todo),
                }),
            ]);
        }));

        updateProgress();
    }

    async function toggle(todo, checked) {
        todo.completed = checked;
        updateProgress();
        const { error } = await supabase.from('todos').update({ completed: checked }).eq('id', todo.id);
        if (error) toast(`저장 실패: ${error.message}`, 'error');
    }

    async function remove(todo) {
        const { error } = await supabase.from('todos').delete().eq('id', todo.id);
        if (error) {
            toast(`삭제 실패: ${error.message}`, 'error');
            return;
        }
        load();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text || !supabase) return;

        const { error } = await supabase
            .from('todos')
            .insert({ category, todo_date: date, task_text: text, completed: false });

        if (error) {
            toast(`추가 실패: ${error.message}`, 'error');
            return;
        }
        input.value = '';
        load();
    });

    datePicker.value = date;
    datePicker.addEventListener('change', () => {
        if (!datePicker.value) return;
        date = datePicker.value;
        load();
    });

    onOwnerChange(render); // 로그인/로그아웃 시 체크박스 잠금 상태 갱신
    load();
}
