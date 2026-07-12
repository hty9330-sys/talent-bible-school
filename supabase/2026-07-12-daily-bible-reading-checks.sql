-- 2026-07-12 하루성경 탭: 개인별 성경 읽음 체크 저장 테이블
-- 각 로그인 사용자가 자신의 읽음 기록만 조회/저장/삭제할 수 있도록 RLS 적용.
-- 읽음 저장은 delete-then-insert 방식(원본 앱과 동일)이라 update 정책은 필요 없음.

create table if not exists public.bible_reading_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_date date not null,
  section text not null check (section in ('psalm', 'old', 'new')),
  created_at timestamptz not null default now(),
  unique (user_id, reading_date, section)
);

create index if not exists bible_reading_checks_user_date_idx
on public.bible_reading_checks(user_id, reading_date);

grant select, insert, delete on public.bible_reading_checks to authenticated;

alter table public.bible_reading_checks enable row level security;

drop policy if exists "read own reading checks" on public.bible_reading_checks;
create policy "read own reading checks"
on public.bible_reading_checks for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "insert own reading checks" on public.bible_reading_checks;
create policy "insert own reading checks"
on public.bible_reading_checks for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "delete own reading checks" on public.bible_reading_checks;
create policy "delete own reading checks"
on public.bible_reading_checks for delete
to authenticated
using (user_id = (select auth.uid()));
