// 팝업(<dialog>) 공통 동작
//  - 열기: dialog.showModal()   닫기: dialog.close()   (ESC 키로도 닫힘)
//  - 바깥 어두운 배경을 클릭하면 닫기
//  - data-close 속성이 붙은 버튼을 누르면 닫기
export function setupDialogs() {
    document.querySelectorAll('dialog.dialog').forEach(dialog => {
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
        });
        dialog.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => dialog.close());
        });
    });
}
