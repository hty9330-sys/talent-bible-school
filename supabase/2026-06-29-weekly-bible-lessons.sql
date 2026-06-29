create table if not exists public.weekly_bible_lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  verse_ref text not null,
  verse_text text not null,
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

insert into public.weekly_bible_lessons (title, verse_ref, verse_text, is_active)
select
  'Bible English Adventure',
  'Colossians 1:19-20 (CSB)',
  'For God was pleased to have all his fullness dwell in him, and through him to reconcile everything, by making peace through his blood, shed on the cross.',
  true
where not exists (select 1 from public.weekly_bible_lessons);
