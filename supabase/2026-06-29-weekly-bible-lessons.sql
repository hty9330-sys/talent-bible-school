create table if not exists public.weekly_bible_lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  verse_ref text not null,
  verse_text text not null,
  verse_ko text not null default '',
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists weekly_bible_lessons_active_created_idx
on public.weekly_bible_lessons(is_active, created_at desc);

grant select, insert, update, delete on public.weekly_bible_lessons to authenticated;

alter table public.weekly_bible_lessons enable row level security;

drop policy if exists "authenticated can read weekly bible lessons" on public.weekly_bible_lessons;
create policy "authenticated can read weekly bible lessons"
on public.weekly_bible_lessons for select
to authenticated
using (true);

drop policy if exists "admins can insert weekly bible lessons" on public.weekly_bible_lessons;
create policy "admins can insert weekly bible lessons"
on public.weekly_bible_lessons for insert
to authenticated
with check (created_by = (select auth.uid()) and private.current_user_role() = 'admin');

drop policy if exists "admins can update weekly bible lessons" on public.weekly_bible_lessons;
create policy "admins can update weekly bible lessons"
on public.weekly_bible_lessons for update
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

alter table public.weekly_bible_lessons
add column if not exists verse_ko text not null default '';

insert into public.weekly_bible_lessons (title, verse_ref, verse_text, verse_ko, is_active)
select
  'Bible English Adventure',
  'Colossians 1:19-20 (CSB)',
  'For God was pleased to have all his fullness dwell in him, and through him to reconcile everything, by making peace through his blood, shed on the cross.',
  '아버지께서는 모든 충만으로 예수 안에 거하게 하시고 그의 십자가의 피로 화평을 이루사 만물이 그로 말미암아 자기와 화목하게 되기를 기뻐하심이라.',
  true
where not exists (select 1 from public.weekly_bible_lessons);
