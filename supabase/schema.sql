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

create index if not exists students_active_name_idx on public.students(is_active, name);
create index if not exists talent_transactions_student_created_idx on public.talent_transactions(student_id, created_at desc);
create index if not exists talent_transactions_teacher_created_idx on public.talent_transactions(teacher_id, created_at desc);
create index if not exists student_notes_student_created_idx on public.student_notes(student_id, created_at desc);

create or replace function public.update_student_total_talents()
returns trigger
language plpgsql
security invoker
as $$
begin
  update public.students
  set total_talents = total_talents + new.amount
  where id = new.student_id;

  return new;
end;
$$;

drop trigger if exists talent_transactions_after_insert on public.talent_transactions;
create trigger talent_transactions_after_insert
after insert on public.talent_transactions
for each row execute function public.update_student_total_talents();

create schema if not exists private;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = (select auth.uid());
$$;

revoke all on function private.current_user_role() from public;
grant execute on function private.current_user_role() to authenticated;

alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.talent_transactions enable row level security;
alter table public.student_notes enable row level security;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users for select
to authenticated
using (id = (select auth.uid()) or private.current_user_role() = 'admin');

drop policy if exists "admins can manage users" on public.users;
create policy "admins can manage users"
on public.users for all
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

drop policy if exists "teachers can read active students" on public.students;
create policy "teachers can read active students"
on public.students for select
to authenticated
using (is_active = true or private.current_user_role() = 'admin');

drop policy if exists "admins can manage students" on public.students;
create policy "admins can manage students"
on public.students for all
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

drop policy if exists "admins can manage transactions" on public.talent_transactions;
create policy "admins can manage transactions"
on public.talent_transactions for all
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

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

drop policy if exists "admins can manage notes" on public.student_notes;
create policy "admins can manage notes"
on public.student_notes for all
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');
