// 여러 기능에서 같이 쓰는 작은 도우미 함수들

/** 날짜를 'YYYY-MM-DD' 문자열로 (예: 2026-10-06) */
export function formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** DB에서 꺼낸 주소가 http(s) 주소인지 확인 (javascript: 같은 위험한 주소 차단) */
export function isSafeUrl(url) {
    try {
        const { protocol } = new URL(url);
        return protocol === 'https:' || protocol === 'http:';
    } catch (e) {
        return false;
    }
}

/**
 * HTML 요소를 만드는 함수 — innerHTML 에 문자열을 끼워 넣지 않아서 안전합니다.
 *
 *   el('button', { className: 'btn', text: '저장', onClick: save })
 *   el('li', { className: 'item' }, [el('span', { text: '제목' }), deleteBtn])
 *
 * - text      : 글자 내용 (그대로 글자로만 들어감)
 * - className : class 이름
 * - dataset   : data-* 속성 묶음
 * - onXxx     : 이벤트 (onClick → click, onChange → change)
 * - 그 외      : 요소의 속성 (type, href, src, disabled ...)
 */
export function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) continue;

        if (key === 'text') node.textContent = value;
        else if (key === 'className') node.className = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
        else if (key in node) node[key] = value;
        else node.setAttribute(key, value);
    }

    node.append(...[].concat(children).filter(child => child !== null && child !== undefined && child !== false));
    return node;
}
