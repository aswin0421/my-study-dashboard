-- ============================================================
-- "보는 건 누구나, 수정은 나만" 보안 설정 + 예전 일지 날짜 형식 변환
--
-- 실행 방법: Supabase 대시보드 → SQL Editor 에 전체 붙여넣기 → Run
--   ⚠️ 실행 전에 아래 [1]의 OWNER_EMAIL@example.com 을
--      Authentication 에 만든 내 계정 이메일로 바꾸세요. (딱 1군데)
--   (기존 정책을 지우는 부분 때문에 "destructive operation" 경고가 뜨면 확인을 누르면 됩니다)
--   여러 번 실행해도 안전합니다.
-- ============================================================


-- [1] 로그인한 사람이 "나"인지 확인하는 함수
create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('OWNER_EMAIL@example.com');
$$;


-- [2] 기존 정책 전부 삭제
--     예전에 만든 "누구나 허용" 정책이 하나라도 남아 있으면 아래 정책이 무용지물이 되기 때문
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname = 'public' and tablename in ('calendar', 'todos', 'logs'))
       or (schemaname = 'storage' and tablename = 'objects'
           and coalesce(qual, '') || coalesce(with_check, '') like '%log_files%')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;


-- [3] 테이블 보안(RLS) 켜기: 읽기는 누구나, 추가·수정·삭제는 나만
alter table public.calendar enable row level security;
alter table public.todos    enable row level security;
alter table public.logs     enable row level security;

create policy "read_all"     on public.calendar for select using (true);
create policy "owner_insert" on public.calendar for insert with check (public.is_owner());
create policy "owner_update" on public.calendar for update using (public.is_owner()) with check (public.is_owner());
create policy "owner_delete" on public.calendar for delete using (public.is_owner());

create policy "read_all"     on public.todos for select using (true);
create policy "owner_insert" on public.todos for insert with check (public.is_owner());
create policy "owner_update" on public.todos for update using (public.is_owner()) with check (public.is_owner());
create policy "owner_delete" on public.todos for delete using (public.is_owner());

create policy "read_all"     on public.logs for select using (true);
create policy "owner_insert" on public.logs for insert with check (public.is_owner());
create policy "owner_update" on public.logs for update using (public.is_owner()) with check (public.is_owner());
create policy "owner_delete" on public.logs for delete using (public.is_owner());


-- [4] 파일 저장소(log_files 버킷)
--     파일 보기는 공개 URL 이라 누구나 가능, 업로드·수정·삭제는 나만
create policy "log_files_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'log_files' and public.is_owner());
create policy "log_files_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'log_files' and public.is_owner());
create policy "log_files_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'log_files' and public.is_owner());


-- [5] 예전 일지 날짜 형식 변환: '7/18' → '2026-07-18'
update public.logs
set log_date = '2026-' || lpad(split_part(log_date, '/', 1), 2, '0')
                 || '-' || lpad(split_part(log_date, '/', 2), 2, '0')
where log_date ~ '^\d{1,2}/\d{1,2}$';


-- [확인] 남아 있는 정책 목록 (아래 결과에 위에서 만든 정책만 보이면 정상)
select schemaname, tablename, policyname, cmd
from pg_policies
where (schemaname = 'public' and tablename in ('calendar', 'todos', 'logs'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
