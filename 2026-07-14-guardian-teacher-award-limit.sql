-- 2026-07-14 guardian-teacher award limit
-- Purpose:
--   If a teacher is also linked as a guardian for the same student, that teacher
--   may only create/update talent rows for:
--     - 매일성경읽기
--     - 매일성경읽기 보너스
--     - 성경학습 with exactly 2 talents
--     - 누락
--
-- Admins remain unrestricted. Teachers who are not guardians for the selected
-- student keep the existing assigned-student behavior. A teacher who is linked
-- only as a guardian can still record the allowed Bible-related rows.

drop policy if exists "teachers can insert transactions" on public.talent_transactions;
drop policy if exists "staff can insert transactions" on public.talent_transactions;
create policy "staff can insert transactions"
on public.talent_transactions for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and (
    private.current_user_role() = 'admin'
    or (
      exists (
        select 1
        from public.student_teachers st
        where st.student_id = talent_transactions.student_id
          and st.teacher_id = (select auth.uid())
      )
      and (
        not exists (
          select 1
          from public.student_guardians sg
          where sg.student_id = talent_transactions.student_id
            and sg.guardian_id = (select auth.uid())
        )
        or reason in ('매일성경읽기', '매일성경읽기 보너스', '누락')
        or (reason = '성경학습' and amount = 2)
      )
    )
    or (
      private.current_user_role() = 'teacher'
      and exists (
        select 1
        from public.student_guardians sg
        where sg.student_id = talent_transactions.student_id
          and sg.guardian_id = (select auth.uid())
      )
      and (
        reason in ('매일성경읽기', '매일성경읽기 보너스', '누락')
        or (reason = '성경학습' and amount = 2)
      )
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
      select 1
      from public.student_teachers st
      where st.student_id = talent_transactions.student_id
        and st.teacher_id = (select auth.uid())
    )
    and (
      not exists (
        select 1
        from public.student_guardians sg
        where sg.student_id = talent_transactions.student_id
          and sg.guardian_id = (select auth.uid())
      )
      or reason in ('매일성경읽기', '매일성경읽기 보너스', '누락')
      or (reason = '성경학습' and amount = 2)
    )
  )
  or (
    private.current_user_role() = 'teacher'
    and teacher_id = (select auth.uid())
    and exists (
      select 1
      from public.student_guardians sg
      where sg.student_id = talent_transactions.student_id
        and sg.guardian_id = (select auth.uid())
    )
    and (
      reason in ('매일성경읽기', '매일성경읽기 보너스', '누락')
      or (reason = '성경학습' and amount = 2)
    )
  )
)
with check (
  private.current_user_role() = 'admin'
  or (
    teacher_id = (select auth.uid())
    and exists (
      select 1
      from public.student_teachers st
      where st.student_id = talent_transactions.student_id
        and st.teacher_id = (select auth.uid())
    )
    and (
      not exists (
        select 1
        from public.student_guardians sg
        where sg.student_id = talent_transactions.student_id
          and sg.guardian_id = (select auth.uid())
      )
      or reason in ('매일성경읽기', '매일성경읽기 보너스', '누락')
      or (reason = '성경학습' and amount = 2)
    )
  )
  or (
    private.current_user_role() = 'teacher'
    and teacher_id = (select auth.uid())
    and exists (
      select 1
      from public.student_guardians sg
      where sg.student_id = talent_transactions.student_id
        and sg.guardian_id = (select auth.uid())
    )
    and (
      reason in ('매일성경읽기', '매일성경읽기 보너스', '누락')
      or (reason = '성경학습' and amount = 2)
    )
  )
);