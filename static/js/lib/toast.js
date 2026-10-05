import { el } from './utils.js';

// 화면 오른쪽 아래에 잠깐 떴다 사라지는 알림 (alert 창 대신 사용)
//   toast('저장했습니다.', 'success')   /   toast('저장 실패', 'error')
const SHOW_MS = 2600;

export function toast(message, type = 'info') {
    const root = document.getElementById('toast-root');
    if (!root) {
        alert(message);
        return;
    }

    const item = el('div', { className: `toast toast-${type}`, text: message, role: 'status' });
    root.append(item);
    requestAnimationFrame(() => item.classList.add('show'));

    setTimeout(() => {
        item.classList.remove('show');
        setTimeout(() => item.remove(), 300); // 사라지는 애니메이션이 끝난 뒤 삭제
    }, SHOW_MS);
}
