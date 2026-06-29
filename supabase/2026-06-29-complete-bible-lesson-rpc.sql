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
