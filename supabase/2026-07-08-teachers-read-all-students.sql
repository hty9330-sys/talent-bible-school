-- 2026-07-08 선생님 전체 아이 열람 허용 (Supabase에 적용 완료)
-- 목적: 선생님 계정도 전체 6명 아이의 달란트 현황을 볼 수 있도록 읽기(SELECT) 정책 확대.
-- 지급/수정/삭제(INSERT/UPDATE/DELETE)는 기존대로 담당 아이 제한 유지.

-- 학생: 선생님도 전체 활성 학생 조회 가능
drop policy if exists "staff and guardians can read allowed students" on public.students;
create policy "staff and guardians can read allowed students"
on public.students for select
to authenticated
using (
  is_active = true
  and (
    private.current_user_role() in ('admin', 'teacher')
    or exists (
      select 1 from public.student_guardians sg
      where sg.student_id = students.id
        and sg.guardian_id = (select auth.uid())
    )
  )
);

-- 달란트 거래: 선생님도 전체 조회 가능 (쓰기는 기존 정책 유지)
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

-- 성경 학습 기록: 선생님도 전체 조회 가능 (홈 주간 학습 완료 인원 표시용)
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
