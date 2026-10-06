-- ============================================================
-- 학교 시간표 테이블 (보는 건 누구나, 수정은 나만)
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 새 쿼리에 붙여넣기 → Run
--   여러 번 실행해도 안전합니다.
--   아래 수업 목록은 테이블이 비어 있을 때만 들어갑니다.
--   이후 수정·추가·삭제는 사이트 '시간표' 페이지에서 로그인 후 하면 됩니다.
--   (owner_only.sql 을 먼저 실행해서 public.is_owner() 함수가 있어야 함)
-- ============================================================

create table if not exists public.timetable (
  id          bigint generated always as identity primary key,
  subject     text     not null,                                   -- 과목명
  professor   text,                                                -- 교수
  room        text,                                                -- 강의실
  weekday     smallint not null check (weekday between 1 and 7),   -- 1=월 2=화 3=수 4=목 5=금 6=토 7=일
  start_time  time     not null,                                   -- 시작 시간
  end_time    time     not null,                                   -- 끝나는 시간
  check (end_time > start_time)
);

-- 보안: 읽기는 누구나, 추가·수정·삭제는 나만
alter table public.timetable enable row level security;

drop policy if exists "read_all"     on public.timetable;
drop policy if exists "owner_insert" on public.timetable;
drop policy if exists "owner_update" on public.timetable;
drop policy if exists "owner_delete" on public.timetable;

create policy "read_all"     on public.timetable for select using (true);
create policy "owner_insert" on public.timetable for insert with check (public.is_owner());
create policy "owner_update" on public.timetable for update using (public.is_owner()) with check (public.is_owner());
create policy "owner_delete" on public.timetable for delete using (public.is_owner());

grant select on public.timetable to anon, authenticated;
grant insert, update, delete on public.timetable to authenticated;


-- 이번 학기 수업 (테이블이 비어 있을 때만 추가)
insert into public.timetable (subject, professor, room, weekday, start_time, end_time)
select * from (values
  ('파이썬프로그래밍', '정현숙', 'IT융합대학-데이터베이스프로그래밍실(7225)', 1, time '09:00', time '11:00'),
  ('문학과신화',       '김영삼', '대학 본관5148 강의실',                     1, time '13:00', time '15:00'),

  ('데이터통신',       '모상만', 'IT융합대학3120 강의실',                    2, time '10:00', time '12:00'),
  ('알고리즘',         '강문수', 'IT융합대학-대형강의실(2104-2)',            2, time '12:00', time '13:00'),
  ('데이터과학',       '김성기', '2119 강의실',                              2, time '13:00', time '15:00'),
  ('운영체제',         '심재홍', 'IT융합대학-대형강의실(2104-2)',            2, time '15:00', time '17:00'),

  ('파이썬프로그래밍', '정현숙', 'IT융합대학-데이터베이스프로그래밍실(7225)', 3, time '09:00', time '11:00'),
  ('문학과신화',       '김영삼', '대학 본관5148 강의실',                     3, time '14:00', time '15:00'),
  ('자바프로그래밍',   '김원',   'IT융합대학-멀티미디어실습실(10221)',       3, time '15:00', time '17:00'),

  ('데이터통신',       '모상만', 'IT융합대학3120 강의실',                    4, time '10:00', time '12:00'),
  ('데이터과학',       '김성기', '2119 강의실',                              4, time '12:00', time '13:00'),
  ('운영체제',         '심재홍', 'IT융합대학-대형강의실(2104-2)',            4, time '14:00', time '15:00'),
  ('알고리즘',         '강문수', 'IT융합대학-대형강의실(2104-2)',            4, time '15:00', time '17:00'),

  ('자바프로그래밍',   '김원',   'IT융합대학-멀티미디어실습실(10221)',       5, time '10:00', time '12:00')
) as v(subject, professor, room, weekday, start_time, end_time)
where not exists (select 1 from public.timetable);

-- 사이트(API)가 새 테이블을 바로 인식하도록
notify pgrst, 'reload schema';


-- [확인] 들어간 수업 목록
select weekday, start_time, end_time, subject, room
from public.timetable
order by weekday, start_time;
