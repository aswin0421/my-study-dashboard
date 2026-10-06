// ==========================================
// 페이지 시작점 — 각 기능은 자기 화면 요소가 있는 페이지에서만 켜집니다.
// ==========================================
//  lib/       : 여러 기능이 같이 쓰는 도구 (Supabase 연결, 로그인, 팝업, 알림, 도우미 함수)
//  features/  : 화면 기능 (스포티파이, 캘린더, 시간표, Todo, 일지, 사진 크게 보기)
import { initAuth } from './lib/auth.js';
import { setupDialogs } from './lib/dialog.js';
import { initSpotify } from './features/spotify.js';
import { initCalendar } from './features/calendar.js';
import { initTimetable, initTodayClasses } from './features/timetable.js';
import { initTodos } from './features/todos.js';
import { initLogs } from './features/logs.js';

setupDialogs();
initAuth();
initSpotify();
initCalendar();      // 메인 페이지
initTodayClasses();  // 메인 페이지 '오늘 수업' 카드
initTimetable();     // 시간표 페이지

// 카테고리 페이지 (<section data-category="cpp"> 처럼 카테고리가 지정된 페이지)
const category = document.querySelector('[data-category]')?.dataset.category;
if (category) {
    initTodos(category);
    initLogs(category);
}
