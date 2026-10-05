// 첨부 사진 크게 보기 팝업 (base.html 의 #image-dialog)
export function openImage(url) {
    const dialog = document.getElementById('image-dialog');
    const img = document.getElementById('image-dialog-img');
    if (!dialog || !img) return;

    img.src = url;
    dialog.addEventListener('close', () => { img.src = ''; }, { once: true });
    dialog.showModal();
}
