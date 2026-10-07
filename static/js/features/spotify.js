import { el } from '../lib/utils.js';

// ==========================================
// 스포티파이 위젯 (상단 바) — 5초마다 현재 재생 곡 확인
// ==========================================
const POLL_MS = 5000;

export function initSpotify() {
    const widget = document.getElementById('spotify-widget');
    if (!widget) return;

    const cover = document.getElementById('spotify-cover');
    const title = document.getElementById('spotify-title');
    const artist = document.getElementById('spotify-artist');

    const dialog = document.getElementById('spotify-dialog');
    const detailCover = document.getElementById('spotify-detail-cover');
    const detailTitle = document.getElementById('spotify-detail-title');
    const detailArtist = document.getElementById('spotify-detail-artist');
    const detailAlbum = document.getElementById('spotify-detail-album');
    const detailLink = document.getElementById('spotify-detail-link');

    let current = null; // 마지막으로 받은 응답

    // 위젯 클릭: 로그인이 필요하면 스포티파이 로그인 창, 재생 중이면 상세 팝업
    widget.addEventListener('click', () => {
        if (!current) return;
        if (current.status === 'need_auth') {
            window.open(current.auth_url, '_blank');
        } else if (current.status === 'playing') {
            detailCover.src = current.cover || '';
            detailCover.hidden = !current.cover;
            detailTitle.textContent = current.title;
            detailArtist.textContent = current.artist;
            detailAlbum.textContent = current.album;
            detailLink.href = current.link || '#';
            dialog.showModal();
        }
    });

    // 앨범 커버: 같은 이미지면 다시 그리지 않음 (5초마다 깜빡이는 것 방지)
    function setCover(src, fallback) {
        if (src) {
            if (cover.querySelector('img')?.getAttribute('src') !== src) {
                cover.replaceChildren(el('img', { src, alt: 'Album Cover' }));
            }
        } else {
            cover.textContent = fallback;
        }
    }

    function render(data) {
        const clickable = data.status === 'need_auth' || data.status === 'playing';
        widget.classList.toggle('is-clickable', clickable);
        widget.classList.toggle('is-playing', data.status === 'playing');

        if (data.status === 'need_auth') {
            setCover(null, '🔒');
            title.textContent = '스포티파이 연동 필요';
            artist.textContent = '클릭하여 계정 로그인';
        } else if (data.status === 'playing') {
            setCover(data.cover, '🎵');
            title.textContent = data.title;
            artist.textContent = data.artist;
        } else {
            setCover(null, '🎵');
            title.textContent = '재생 중인 곡 없음';
            artist.textContent = 'Spotify 쉼표';
        }
    }

    let timer = null;

    async function update() {
        try {
            const response = await fetch('/api/spotify');
            current = await response.json();

            // 서버에 스포티파이 키가 없으면 위젯을 숨기고 더 이상 묻지 않음
            if (current.status === 'disabled') {
                widget.hidden = true;
                clearInterval(timer);
                document.removeEventListener('visibilitychange', onVisible);
                return;
            }
            render(current);
        } catch (err) {
            console.error('Spotify 통신 에러:', err);
        }
    }

    // 탭이 안 보일 때는 요청을 쉬고, 다시 보이면 바로 갱신
    function onVisible() {
        if (!document.hidden) update();
    }

    update();
    timer = setInterval(onVisible, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
}
