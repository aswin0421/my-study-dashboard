import { supabase } from '../lib/supabase.js';
import { isOwner, onOwnerChange } from '../lib/auth.js';
import { toast } from '../lib/toast.js';
import { el, formatDate, isSafeUrl } from '../lib/utils.js';
import { openImage } from './image-viewer.js';

// ==========================================
// 카테고리 페이지: 공부 일지 작성·수정·삭제 (Supabase logs 테이블 + log_files 저장소)
// ==========================================
//  - 목록에서 일지를 누르면 작성칸에 불러와서 '수정 모드'가 됨 → 저장하면 그 일지가 수정됨
//  - '수정 취소'를 누르면 다시 '새 일지 쓰기' 모드
const BUCKET = 'log_files';

export function initLogs(category) {
    const list = document.getElementById('log-list');
    if (!list) return;

    const titleInput = document.getElementById('log-title');
    const contentInput = document.getElementById('log-content');
    const preview = document.getElementById('log-attachment-preview');
    const imageInput = document.getElementById('image-upload');
    const fileInput = document.getElementById('file-upload');
    const fileInfo = document.getElementById('attached-file-info');
    const saveBtn = document.getElementById('save-log-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const modeBadge = document.getElementById('log-mode-badge');
    const countText = document.getElementById('log-count');
    const emptyText = document.getElementById('log-empty');

    let logs = [];
    let selected = null;      // 목록에서 고른 일지 (null 이면 '새 일지 쓰기' 모드)
    let removeImage = false;  // 수정 모드에서 기존 사진을 지우기로 했는지 (저장해야 반영)
    let removeFile = false;   // 수정 모드에서 기존 파일을 지우기로 했는지 (저장해야 반영)
    let saving = false;

    // ---------- 불러오기 / 목록 ----------
    async function load() {
        if (!supabase) return;

        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .eq('category', category)
            .order('id', { ascending: false });

        if (error) {
            console.error('일지 불러오기 에러:', error);
            toast('일지를 불러오지 못했습니다.', 'error');
            return;
        }
        logs = data || [];
        renderList();
    }

    function renderList() {
        countText.textContent = logs.length || '';
        emptyText.hidden = logs.length > 0;

        list.replaceChildren(...logs.map(log => el('li', {
            className: selected && selected.id === log.id ? 'log-item is-active' : 'log-item',
            dataset: { id: log.id },
            tabIndex: 0,
            onClick: () => select(log),
            onKeydown: (e) => { if (e.key === 'Enter') select(log); },
        }, [
            el('span', { className: 'log-date', text: log.log_date }),
            el('span', { className: 'log-title', text: log.title }),
            (log.image_url || log.file_url) ? el('span', { className: 'log-clip', text: '📎', title: '첨부 있음' }) : null,
            el('button', {
                type: 'button',
                className: 'icon-btn icon-btn-sm log-delete owner-only',
                text: '×',
                'aria-label': '일지 삭제',
                onClick: (e) => {
                    e.stopPropagation(); // 일지 선택(클릭)까지 같이 실행되지 않게
                    remove(log);
                },
            }),
        ])));
    }

    // ---------- 선택 / 작성칸 상태 ----------
    function select(log) {
        selected = log;
        removeImage = false;
        removeFile = false;

        titleInput.value = log ? log.title : '';
        contentInput.value = log ? (log.content || '') : '';
        imageInput.value = '';
        fileInput.value = '';

        updateFileInfo();
        renderPreview();
        updateMode();

        list.querySelectorAll('.log-item').forEach(item => {
            item.classList.toggle('is-active', !!log && item.dataset.id === String(log.id));
        });
    }

    function updateMode() {
        const owner = isOwner();
        const editing = !!selected;

        if (!saving) saveBtn.textContent = editing ? '수정 저장' : '저장';
        cancelBtn.hidden = !editing;

        modeBadge.textContent = !owner ? '읽기 전용' : editing ? '수정 중' : '새 일지';
        modeBadge.classList.toggle('is-accent', owner && editing);

        // 방문자는 일지를 읽기만 가능
        titleInput.readOnly = !owner;
        contentInput.readOnly = !owner;
        titleInput.placeholder = owner ? '제목' : 'Study List 에서 일지를 선택하세요';
        contentInput.placeholder = owner ? '오늘 공부한 내용을 적어주세요 (Ctrl + Enter 로 저장)' : '';
    }

    function updateFileInfo() {
        const names = [];
        if (imageInput.files[0]) names.push(`📷 ${imageInput.files[0].name}`);
        if (fileInput.files[0]) names.push(`📁 ${fileInput.files[0].name}`);

        fileInfo.classList.toggle('has-file', names.length > 0);
        if (names.length) {
            fileInfo.textContent = names.join('  ·  ');
        } else {
            // 수정 모드에서는 새로 첨부하면 기존 첨부가 교체된다는 안내
            fileInfo.textContent = selected ? '새로 첨부하면 기존 첨부가 교체됩니다.' : '첨부된 파일이 없습니다.';
        }
    }

    // 선택한 일지의 사진·파일 미리보기
    function renderPreview() {
        const items = [];
        const imageUrl = selected && !removeImage ? selected.image_url : null;
        const fileUrl = selected && !removeFile ? selected.file_url : null;

        if (imageUrl && isSafeUrl(imageUrl)) {
            items.push(el('figure', { className: 'attachment attachment-image' }, [
                el('img', { src: imageUrl, alt: '첨부 이미지', onClick: () => openImage(imageUrl) }),
                el('figcaption', {}, [
                    el('span', { text: '📷 첨부 이미지 · 클릭하여 크게 보기' }),
                    el('button', {
                        type: 'button',
                        className: 'link-btn owner-only',
                        text: '사진 삭제',
                        onClick: () => { removeImage = true; renderPreview(); },
                    }),
                ]),
            ]));
        }

        if (fileUrl && isSafeUrl(fileUrl)) {
            items.push(el('div', { className: 'attachment attachment-file' }, [
                el('a', { href: fileUrl, target: '_blank', rel: 'noopener', className: 'file-chip', text: '📎 첨부파일 열기 / 다운로드' }),
                el('button', {
                    type: 'button',
                    className: 'link-btn owner-only',
                    text: '파일 삭제',
                    onClick: () => { removeFile = true; renderPreview(); },
                }),
            ]));
        }

        preview.replaceChildren(...items);
        preview.hidden = items.length === 0;
    }

    // ---------- 저장 / 수정 / 삭제 ----------
    // Storage(log_files)에 파일을 올리고 공개 URL 을 돌려주는 함수
    async function upload(file, prefix) {
        const ext = file.name.split('.').pop();
        const fileName = `${prefix}_${Date.now()}.${ext}`; // 이름이 안 겹치게 현재 시간 추가

        const { error } = await supabase.storage.from(BUCKET).upload(fileName, file);
        if (error) throw error;

        return supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
    }

    async function save() {
        if (saving) return;
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title) {
            toast('일지 제목을 입력해주세요!', 'error');
            titleInput.focus();
            return;
        }
        if (!supabase) {
            toast('클라우드 연결이 확인되지 않아 저장할 수 없습니다.', 'error');
            return;
        }

        // 업로드 중에 다른 일지를 눌러도 섞이지 않도록, 누른 순간의 상태를 기억
        const target = selected;
        const dropImage = removeImage;
        const dropFile = removeFile;

        saving = true;
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';

        try {
            // 1. 새로 첨부한 사진·파일이 있으면 Storage에 올리고 URL 받아오기
            const newImageUrl = imageInput.files[0] ? await upload(imageInput.files[0], 'img') : null;
            const newFileUrl = fileInput.files[0] ? await upload(fileInput.files[0], 'file') : null;

            if (target) {
                // 2-A. 기존 일지 수정: 새 첨부가 있으면 교체, 삭제 표시했으면 비우고, 아니면 기존 첨부 유지
                const { data, error } = await supabase
                    .from('logs')
                    .update({
                        title,
                        content,
                        image_url: newImageUrl || (dropImage ? null : target.image_url),
                        file_url: newFileUrl || (dropFile ? null : target.file_url),
                    })
                    .eq('id', target.id)
                    .select('id');

                if (error) throw error;
                // 권한이 없으면 에러 없이 '0건 수정'으로 끝나므로 결과 개수로 확인
                if (!data || data.length === 0) throw new Error('수정 권한이 없습니다. 로그인 상태를 확인하세요.');
                toast('일지를 수정했습니다.', 'success');
            } else {
                // 2-B. 새 일지 저장
                const { error } = await supabase.from('logs').insert({
                    category,
                    log_date: formatDate(new Date()), // 연도까지 포함 (예: 2026-10-06)
                    title,
                    content,
                    image_url: newImageUrl,
                    file_url: newFileUrl,
                });
                if (error) throw error;
                toast('일지를 저장했습니다.', 'success');
            }

            // 3. 성공하면 '새 일지' 모드로 돌아가고 목록 새로고침
            select(null);
            await load();
        } catch (err) {
            console.error('저장 에러 상세:', err);
            toast(`저장 실패: ${err.message}`, 'error');
        } finally {
            saving = false;
            saveBtn.disabled = false;
            updateMode();
        }
    }

    async function remove(log) {
        if (!confirm(`'${log.title}' 일지를 삭제하시겠습니까?`)) return;

        const { error } = await supabase.from('logs').delete().eq('id', log.id);
        if (error) {
            toast(`삭제 실패: ${error.message}`, 'error');
            return;
        }
        if (selected && selected.id === log.id) select(null); // 수정 중이던 일지를 지웠으면 작성칸 비우기
        toast('일지를 삭제했습니다.');
        load();
    }

    // ---------- 이벤트 연결 ----------
    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', () => select(null));
    imageInput.addEventListener('change', updateFileInfo);
    fileInput.addEventListener('change', updateFileInfo);

    // Ctrl + Enter 로 바로 저장
    contentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && isOwner()) save();
    });

    onOwnerChange(updateMode);
    select(null);
    load();
}
