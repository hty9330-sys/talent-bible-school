-- 2026-06-30 policy adjustment after weekly Bible completion
-- Purpose: merge guardian/staff INSERT policies to avoid duplicate permissive policy warnings.

drop policy if exists "guardians can insert bible learning transactions" on public.talent_transactions;
drop policy if exists "staff can insert transactions" on public.talent_transactions;
create policy "connected users can insert bible and staff transactions"
on public.talent_transactions for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and (
    (
      private.current_user_role() = 'admin'
      or exists (
        select 1 from public.student_teachers st
        where st.student_id = talent_transactions.student_id
          and st.teacher_id = (select auth.uid())
      )
    )
    or (
      amount = 2
      and reason = '성경학습'
      and exists (
        select 1 from public.student_guardians sg
        where sg.student_id = talent_transactions.student_id
          and sg.guardian_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists "guardians can insert bible records" on public.bible_learning_records;
drop policy if exists "staff can insert bible records" on public.bible_learning_records;
create policy "connected users can insert bible records"
on public.bible_learning_records for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and talents_awarded = 2
  and lesson_week = to_char(current_date, 'IYYY-IW')
  and (
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
  )
);
