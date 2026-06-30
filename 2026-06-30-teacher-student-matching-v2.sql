-- 2026-06-30 teacher-student matching update
-- Purpose: teacher accounts see and write records only for assigned active students.
-- Run in Supabase SQL Editor for project talent-bible-school (eesdzgehomzccrrykrqb).

create table if not exists public.student_teachers (
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, teacher_id)
);

create index if not exists student_teachers_teacher_idx on public.student_teachers(teacher_id, student_id);
create index if not exists student_teachers_student_idx on public.student_teachers(student_id, teacher_id);

grant select, insert, update, delete on public.student_teachers to authenticated;
alter table public.student_teachers enable row level security;

drop policy if exists "admins can manage teacher links" on public.student_teachers;
create policy "admins can manage teacher links"
on public.student_teachers for all
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

drop policy if exists "teachers can read own teacher links" on public.student_teachers;
create policy "teachers can read own teacher links"
on public.student_teachers for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or teacher_id = (select auth.uid())
);

-- Students: admin = all active, teacher = assigned active, guardian = linked active.
drop policy if exists "staff and guardians can read allowed students" on public.students;
create policy "staff and guardians can read allowed students"
on public.students for select
to authenticated
using (
  is_active = true
  and (
    private.current_user_role() = 'admin'
    or exists (
      select 1 from public.student_teachers st
      where st.student_id = students.id
        and st.teacher_id = (select auth.uid())
    )
    or exists (
      select 1 from public.student_guardians sg
      where sg.student_id = students.id
        and sg.guardian_id = (select auth.uid())
    )
  )
);

-- Talent transactions: teachers can read/write only for assigned students.
drop policy if exists "staff and guardians can read transactions" on public.talent_transactions;
create policy "staff and guardians can read transactions"
on public.talent_transactions for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.student_teachers st
    where st.student_id = talent_transactions.student_id
      and st.teacher_id = (select auth.uid())
  )
  or exists (
    select 1 from public.student_guardians sg
    where sg.student_id = talent_transactions.student_id
      and sg.guardian_id = (select auth.uid())
  )
);

drop policy if exists "staff can insert transactions" on public.talent_transactions;
create policy "staff can insert transactions"
on public.talent_transactions for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and (
    private.current_user_role() = 'admin'
    or exists (
      select 1 from public.student_teachers st
      where st.student_id = talent_transactions.student_id
        and st.teacher_id = (select auth.uid())
    )
  )
);

drop policy if exists "staff can update transactions" on public.talent_transactions;
create policy "staff can update transactions"
on public.talent_transactions for update
to authenticated
using (
  private.current_user_role() = 'admin'
  or (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.student_teachers st
      where st.student_id = talent_transactions.student_id
        and st.teacher_id = (select auth.uid())
    )
  )
)
with check (
  private.current_user_role() = 'admin'
  or (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.student_teachers st
      where st.student_id = talent_transactions.student_id
        and st.teacher_id = (select auth.uid())
    )
  )
);

drop policy if exists "staff can delete transactions" on public.talent_transactions;
create policy "staff can delete transactions"
on public.talent_transactions for delete
to authenticated
using (
  private.current_user_role() = 'admin'
  or (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.student_teachers st
      where st.student_id = talent_transactions.student_id
        and st.teacher_id = (select auth.uid())
    )
  )
);

-- Teacher notes: teachers can read/write notes only for assigned students.
drop policy if exists "staff can read notes" on public.student_notes;
create policy "staff can read notes"
on public.student_notes for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.student_teachers st
    where st.student_id = student_notes.student_id
      and st.teacher_id = (select auth.uid())
  )
);

drop policy if exists "staff can insert notes" on public.student_notes;
create policy "staff can insert notes"
on public.student_notes for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and (
    private.current_user_role() = 'admin'
    or exists (
      select 1 from public.student_teachers st
      where st.student_id = student_notes.student_id
        and st.teacher_id = (select auth.uid())
    )
  )
);

-- Bible learning records: same visibility as talent records.
drop policy if exists "staff and guardians can read bible records" on public.bible_learning_records;
create policy "staff and guardians can read bible records"
on public.bible_learning_records for select
to authenticated
using (
  private.current_user_role() = 'admin'
  or exists (
    select 1 from public.student_teachers st
    where st.student_id = bible_learning_records.student_id
      and st.teacher_id = (select auth.uid())
  )
  or exists (
    select 1 from public.student_guardians sg
    where sg.student_id = bible_learning_records.student_id
      and sg.guardian_id = (select auth.uid())
  )
);

drop policy if exists "staff can insert bible records" on public.bible_learning_records;
create policy "staff can insert bible records"
on public.bible_learning_records for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and (
    private.current_user_role() = 'admin'
    or exists (
      select 1 from public.student_teachers st
      where st.student_id = bible_learning_records.student_id
        and st.teacher_id = (select auth.uid())
    )
  )
);
