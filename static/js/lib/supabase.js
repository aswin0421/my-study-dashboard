// Supabase 클라이언트 — 모든 기능이 이 하나를 같이 씁니다.
// (base.html 에서 supabase-js CDN 스크립트와 window.ENV 를 먼저 불러옵니다)
const { SUPABASE_URL, SUPABASE_KEY } = window.ENV || {};

export const supabase = (window.supabase && SUPABASE_URL && SUPABASE_KEY)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

if (!supabase) {
    console.error('수파베이스가 연결되지 않았습니다. (.env 의 SUPABASE_URL / SUPABASE_KEY 확인)');
}
