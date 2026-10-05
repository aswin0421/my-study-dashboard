import { supabase } from './supabase.js';
import { toast } from './toast.js';

// ==========================================
// 로그인: 보는 건 누구나, 수정은 나만
// ==========================================
// 로그인하면 body 에 is-owner 클래스가 붙어서 수정용 버튼·입력칸(.owner-only)이 보입니다.
// 화면만 바꾸는 것이고, 실제로 남이 수정 못 하게 막는 건 Supabase RLS 정책입니다.

let owner = false;
const listeners = []; // 로그인 상태가 바뀔 때마다 다시 실행할 함수들

/** 지금 로그인한 상태인지 */
export const isOwner = () => owner;

/** 로그인 상태가 바뀔 때마다 실행할 함수 등록 (등록 즉시 한 번 실행) */
export function onOwnerChange(fn) {
    listeners.push(fn);
    fn(owner);
}

function setOwner(value) {
    owner = value;
    document.body.classList.toggle('is-owner', value);
    listeners.forEach(fn => fn(value));
}

export function initAuth() {
    const authBtn = document.getElementById('auth-btn');
    const dialog = document.getElementById('login-dialog');
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorText = document.getElementById('login-error');

    onOwnerChange(loggedIn => {
        if (authBtn) authBtn.textContent = loggedIn ? '로그아웃' : '로그인';
    });

    if (!supabase) return;

    // 페이지를 열 때(INITIAL_SESSION), 로그인/로그아웃할 때마다 호출됨
    supabase.auth.onAuthStateChange((_event, session) => setOwner(!!session));

    authBtn?.addEventListener('click', async () => {
        if (owner) {
            if (confirm('로그아웃 하시겠습니까?')) {
                await supabase.auth.signOut();
                toast('로그아웃되었습니다.');
            }
            return;
        }
        errorText.textContent = '';
        dialog.showModal();
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault(); // 폼 제출로 페이지가 새로고침되는 것 막기
        errorText.textContent = '';

        const { error } = await supabase.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: passwordInput.value,
        });

        if (error) {
            errorText.textContent = '로그인 실패: 이메일 또는 비밀번호를 확인하세요.';
            return;
        }
        passwordInput.value = '';
        dialog.close();
        toast('로그인되었습니다.', 'success');
    });

    dialog?.addEventListener('close', () => {
        passwordInput.value = '';
    });
}
