-- ============================================================
-- calendar 테이블에 "진짜 날짜(date)" 컬럼 추가
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 새 쿼리에 붙여넣기 → Run
--   여러 번 실행해도 안전합니다.
--
-- 지금 날짜 키(event_date = 'memo_2026_9_6', 월이 0부터)는 그대로 두고,
-- 그 값에서 자동으로 계산되는 day 컬럼(2026-10-06)을 하나 더 만듭니다.
--   → 웹사이트 코드는 바꿀 필요 없음 (일정을 저장하면 day 는 DB가 알아서 채움)
--   → 알림·통계에서는 day = '2026-10-06' 처럼 바로 날짜로 조회 가능
-- ============================================================

alter table public.calendar
  add column if not exists day date
  generated always as (
    make_date(
      split_part(event_date, '_', 2)::int,       -- 연
      split_part(event_date, '_', 3)::int + 1,   -- 월 (0부터 시작이라 +1)
      split_part(event_date, '_', 4)::int        -- 일
    )
  ) stored;

-- 날짜로 찾을 때 빠르게
create index if not exists calendar_day_idx on public.calendar (day);


-- [확인] 날짜가 제대로 계산됐는지 최근 일정 10개 보기
select event_date, day, content
from public.calendar
order by day desc
limit 10;
