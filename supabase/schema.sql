create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'teacher')),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text not null,
  group_name text not null,
  guardian_contact text,
  total_talents integer not null default 0 check (total_talents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.talent_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  teacher_id uuid not null references public.users(id) on delete restrict,
  amount integer not null check (amount > 0),
  reason text not null,
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  teacher_id uuid not null references public.users(id) on delete restrict,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bible_learning_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  teacher_id uuid not null references public.users(id) on delete restrict,
  lesson_title text not null,
  verse_ref text not null,
  completed_items integer not null default 0 check (completed_items >= 0),
  talents_awarded integer not null default 0 check (talents_awarded >= 0),
  created_at timestamptz not null default now()
);

create index if not exists students_active_name_idx on public.students(is_active, name);
create index if not exists talent_transactions_student_created_idx on public.talent_transactions(student_id, created_at desc);
create index if not exists talent_transactions_teacher_created_idx on public.talent_transactions(teacher_id, created_at desc);
create index if not exists student_notes_student_created_idx on public.student_notes(student_id, created_at desc);
create index if not exists student_notes_teacher_created_idx on public.student_notes(teacher_id, created_at desc);
create index if not exists bible_learning_records_student_created_idx on public.bible_learning_records(student_id, created_at desc);
create index if not exists bible_learning_records_teacher_created_idx on public.bible_learning_records(teacher_id, created_at desc);

create or replace function public.update_student_total_talents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.student_id = new.student_id then
      update public.students
      set total_talents = total_talents + new.amount - old.amount
      where id = new.student_id;
    else
      update public.students
      set total_talents = total_talents - old.amount
      where id = old.student_id;

      update public.students
      set total_talents = total_talents + new.amount
      where id = new.student_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.students
    set total_talents = greatest(total_talents - old.amount, 0)
    where id = old.student_id;
    return old;
  end if;

  update public.students
  set total_talents = total_talents + new.amount
  where id = new.student_id;
  return new;
end;
$$;

revoke all on function public.update_student_total_talents() from public, anon, authenticated;

drop trigger if exists talent_transactions_after_insert on public.talent_transactions;
create trigger talent_transactions_after_insert
after insert or update or delete on public.talent_transactions
for each row execute function public.update_student_total_talents();

create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = (select auth.uid());
$$;

revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated;

create or replace function public.complete_bible_lesson(
  p_student_id uuid,
  p_lesson_title text,
  p_verse_ref text,
  p_completed_items integer,
  p_talents_awarded integer default 2
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if private.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Only admins and teachers can complete bible lessons.';
  end if;

  if p_talents_awarded < 1 then
    raise exception 'Talents awarded must be positive.';
  end if;

  insert into public.bible_learning_records (
    student_id,
    teacher_id,
    lesson_title,
    verse_ref,
    completed_items,
    talents_awarded
  )
  values (
    p_student_id,
    (select auth.uid()),
    p_lesson_title,
    p_verse_ref,
    p_completed_items,
    p_talents_awarded
  );

  insert into public.talent_transactions (
    student_id,
    teacher_id,
    amount,
    reason,
    memo
  )
  values (
    p_student_id,
    (select auth.uid()),
    p_talents_awarded,
    '영어학습',
    p_lesson_title || ' 학습 완료'
  );
end;
$$;

revoke all on function public.complete_bible_lesson(uuid, text, text, integer, integer) from public, anon;
grant execute on function public.complete_bible_lesson(uuid, text, text, integer, integer) to authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.talent_transactions to authenticated;
grant select, insert, update, delete on public.student_notes to authenticated;
grant select, insert, update, delete on public.bible_learning_records to authenticated;

alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.talent_transactions enable row level security;
alter table public.student_notes enable row level security;
alter table public.bible_learning_records enable row level security;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users for select
to authenticated
using (id = (select auth.uid()) or private.current_user_role() = 'admin');

drop policy if exists "teachers can read active students" on public.students;
create policy "teachers can read active students"
on public.students for select
to authenticated
using (is_active = true or private.current_user_role() = 'admin');

drop policy if exists "teachers can create students" on public.students;
drop policy if exists "staff can create students" on public.students;
drop policy if exists "admins can create students" on public.students;
create policy "admins can create students"
on public.students for insert
to authenticated
with check (private.current_user_role() = 'admin');

drop policy if exists "admins can update students" on public.students;
create policy "admins can update students"
on public.students for update
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

drop policy if exists "teachers can read transactions" on public.talent_transactions;
create policy "teachers can read transactions"
on public.talent_transactions for select
to authenticated
using (true);

drop policy if exists "teachers can insert transactions" on public.talent_transactions;
create policy "teachers can insert transactions"
on public.talent_transactions for insert
to authenticated
with check (teacher_id = (select auth.uid()));

drop policy if exists "staff can update transactions" on public.talent_transactions;
create policy "staff can update transactions"
on public.talent_transactions for update
to authenticated
using (
  private.current_user_role() = 'admin'
  or (private.current_user_role() = 'teacher' and teacher_id = (select auth.uid()))
)
with check (
  private.current_user_role() = 'admin'
  or (private.current_user_role() = 'teacher' and teacher_id = (select auth.uid()))
);

drop policy if exists "staff can delete transactions" on public.talent_transactions;
create policy "staff can delete transactions"
on public.talent_transactions for delete
to authenticated
using (
  private.current_user_role() = 'admin'
  or (private.current_user_role() = 'teacher' and teacher_id = (select auth.uid()))
);

drop policy if exists "teachers can read notes" on public.student_notes;
create policy "teachers can read notes"
on public.student_notes for select
to authenticated
using (true);

drop policy if exists "teachers can insert notes" on public.student_notes;
create policy "teachers can insert notes"
on public.student_notes for insert
to authenticated
with check (teacher_id = (select auth.uid()));

drop policy if exists "teachers can read bible records" on public.bible_learning_records;
create policy "teachers can read bible records"
on public.bible_learning_records for select
to authenticated
using (true);

drop policy if exists "teachers can insert bible records" on public.bible_learning_records;
create policy "teachers can insert bible records"
on public.bible_learning_records for insert
to authenticated
with check (teacher_id = (select auth.uid()));

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
