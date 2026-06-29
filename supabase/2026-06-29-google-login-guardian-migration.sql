alter table public.users drop constraint if exists users_role_check;
alter table public.users alter column role set default 'guardian';
alter table public.users add constraint users_role_check check (role in ('admin', 'teacher', 'guardian'));

create table if not exists public.student_guardians (
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.users(id) on delete cascade,
  relationship text not null default '보호자',
  created_at timestamptz not null default now(),
  primary key (student_id, guardian_id)
);

create index if not exists student_guardians_guardian_idx on public.student_guardians(guardian_id);
create index if not exists student_guardians_student_idx on public.student_guardians(student_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, '사용자'), '@', 1)),
    'guardian'
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(nullif(public.users.name, ''), excluded.name);
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_create_public_profile on auth.users;
create trigger on_auth_user_created_create_public_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.student_guardians enable row level security;

grant select, insert, update, delete on public.student_guardians to authenticated;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users for select
to authenticated
using (id = (select auth.uid()) or private.current_user_role() = 'admin');

drop policy if exists "admins can update users" on public.users;
create policy "admins can update users"
on public.users for update
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

drop policy if exists "teachers can read active students" on public.students;
drop policy if exists "staff and guardians can read allowed students" on public.students;
create policy "staff and guardians can read allowed students"
on public.students for select
to authenticated
using (
  is_active = true and (
    private.current_user_role() in ('admin', 'teacher')
    or exists (
      select 1 from public.student_guardians sg
      where sg.student_id = students.id
      and sg.guardian_id = (select auth.uid())
    )
  )
);

drop policy if exists "guardians can read own links" on public.student_guardians;
create policy "guardians can read own links"
on public.student_guardians for select
to authenticated
using (guardian_id = (select auth.uid()) or private.current_user_role() in ('admin', 'teacher'));

drop policy if exists "admins can manage guardian links" on public.student_guardians;
create policy "admins can manage guardian links"
on public.student_guardians for all
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

drop policy if exists "teachers can read transactions" on public.talent_transactions;
drop policy if exists "staff and guardians can read transactions" on public.talent_transactions;
create policy "staff and guardians can read transactions"
on public.talent_transactions for select
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  or exists (
    select 1 from public.student_guardians sg
    where sg.student_id = talent_transactions.student_id
    and sg.guardian_id = (select auth.uid())
  )
);

drop policy if exists "teachers can insert transactions" on public.talent_transactions;
drop policy if exists "staff can insert transactions" on public.talent_transactions;
create policy "staff can insert transactions"
on public.talent_transactions for insert
to authenticated
with check (teacher_id = (select auth.uid()) and private.current_user_role() in ('admin', 'teacher'));

drop policy if exists "teachers can read notes" on public.student_notes;
drop policy if exists "staff can read notes" on public.student_notes;
create policy "staff can read notes"
on public.student_notes for select
to authenticated
using (private.current_user_role() in ('admin', 'teacher'));

drop policy if exists "teachers can insert notes" on public.student_notes;
drop policy if exists "staff can insert notes" on public.student_notes;
create policy "staff can insert notes"
on public.student_notes for insert
to authenticated
with check (teacher_id = (select auth.uid()) and private.current_user_role() in ('admin', 'teacher'));

drop policy if exists "teachers can read bible records" on public.bible_learning_records;
drop policy if exists "staff and guardians can read bible records" on public.bible_learning_records;
create policy "staff and guardians can read bible records"
on public.bible_learning_records for select
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher')
  or exists (
    select 1 from public.student_guardians sg
    where sg.student_id = bible_learning_records.student_id
    and sg.guardian_id = (select auth.uid())
  )
);

drop policy if exists "teachers can insert bible records" on public.bible_learning_records;
drop policy if exists "staff can insert bible records" on public.bible_learning_records;
create policy "staff can insert bible records"
on public.bible_learning_records for insert
to authenticated
with check (teacher_id = (select auth.uid()) and private.current_user_role() in ('admin', 'teacher'));
