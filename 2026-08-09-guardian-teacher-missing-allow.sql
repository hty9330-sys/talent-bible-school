-- 2026-08-09 guardian-teacher missing-award allow
-- Purpose:
--   Teachers cannot create or update missing talent rows for ordinary assigned
--   students, but a teacher who is linked as a guardian for that student may
--   record missing rows. Admins remain unrestricted.
--
-- Reason literals use PostgreSQL Unicode escapes to avoid editor encoding drift:
--   \B204\B77D = missing
--   \B9E4\C77C\C131\ACBD\C77D\AE30 = daily Bible reading
--   \B9E4\C77C\C131\ACBD\C77D\AE30 \BCF4\B108\C2A4 = daily Bible reading bonus
--   \C131\ACBD\D559\C2B5 = Bible learning

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
      private.current_user_role() = 'teacher'
      and exists (
        select 1
        from public.student_teachers st
        where st.student_id = talent_transactions.student_id
          and st.teacher_id = (select auth.uid())
      )
      and (
        (
          exists (
            select 1
            from public.student_guardians sg
            where sg.student_id = talent_transactions.student_id
              and sg.guardian_id = (select auth.uid())
          )
          and (
            reason in (
              U&'\B9E4\C77C\C131\ACBD\C77D\AE30',
              U&'\B9E4\C77C\C131\ACBD\C77D\AE30 \BCF4\B108\C2A4',
              U&'\B204\B77D'
            )
            or (reason = U&'\C131\ACBD\D559\C2B5' and amount = 2)
          )
        )
        or (
          not exists (
            select 1
            from public.student_guardians sg
            where sg.student_id = talent_transactions.student_id
              and sg.guardian_id = (select auth.uid())
          )
          and reason <> U&'\B204\B77D'
        )
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
        reason in (
          U&'\B9E4\C77C\C131\ACBD\C77D\AE30',
          U&'\B9E4\C77C\C131\ACBD\C77D\AE30 \BCF4\B108\C2A4',
          U&'\B204\B77D'
        )
        or (reason = U&'\C131\ACBD\D559\C2B5' and amount = 2)
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
    private.current_user_role() = 'teacher'
    and teacher_id = (select auth.uid())
    and exists (
      select 1
      from public.student_teachers st
      where st.student_id = talent_transactions.student_id
        and st.teacher_id = (select auth.uid())
    )
    and (
      (
        exists (
          select 1
          from public.student_guardians sg
          where sg.student_id = talent_transactions.student_id
            and sg.guardian_id = (select auth.uid())
        )
        and (
          reason in (
            U&'\B9E4\C77C\C131\ACBD\C77D\AE30',
            U&'\B9E4\C77C\C131\ACBD\C77D\AE30 \BCF4\B108\C2A4',
            U&'\B204\B77D'
          )
          or (reason = U&'\C131\ACBD\D559\C2B5' and amount = 2)
        )
      )
      or (
        not exists (
          select 1
          from public.student_guardians sg
          where sg.student_id = talent_transactions.student_id
            and sg.guardian_id = (select auth.uid())
        )
        and reason <> U&'\B204\B77D'
      )
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
      reason in (
        U&'\B9E4\C77C\C131\ACBD\C77D\AE30',
        U&'\B9E4\C77C\C131\ACBD\C77D\AE30 \BCF4\B108\C2A4',
        U&'\B204\B77D'
      )
      or (reason = U&'\C131\ACBD\D559\C2B5' and amount = 2)
    )
  )
)
with check (
  private.current_user_role() = 'admin'
  or (
    private.current_user_role() = 'teacher'
    and teacher_id = (select auth.uid())
    and exists (
      select 1
      from public.student_teachers st
      where st.student_id = talent_transactions.student_id
        and st.teacher_id = (select auth.uid())
    )
    and (
      (
        exists (
          select 1
          from public.student_guardians sg
          where sg.student_id = talent_transactions.student_id
            and sg.guardian_id = (select auth.uid())
        )
        and (
          reason in (
            U&'\B9E4\C77C\C131\ACBD\C77D\AE30',
            U&'\B9E4\C77C\C131\ACBD\C77D\AE30 \BCF4\B108\C2A4',
            U&'\B204\B77D'
          )
          or (reason = U&'\C131\ACBD\D559\C2B5' and amount = 2)
        )
      )
      or (
        not exists (
          select 1
          from public.student_guardians sg
          where sg.student_id = talent_transactions.student_id
            and sg.guardian_id = (select auth.uid())
        )
        and reason <> U&'\B204\B77D'
      )
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
      reason in (
        U&'\B9E4\C77C\C131\ACBD\C77D\AE30',
        U&'\B9E4\C77C\C131\ACBD\C77D\AE30 \BCF4\B108\C2A4',
        U&'\B204\B77D'
      )
      or (reason = U&'\C131\ACBD\D559\C2B5' and amount = 2)
    )
  )
);
