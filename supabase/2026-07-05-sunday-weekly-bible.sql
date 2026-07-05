drop policy if exists "connected users can insert bible records" on public.bible_learning_records;

create policy "connected users can insert bible records"
on public.bible_learning_records
for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and talents_awarded = 2
  and lesson_week = to_char(
    (((now() at time zone 'Asia/Seoul')::date
      - extract(dow from (now() at time zone 'Asia/Seoul')::date)::int)::timestamp),
    'YYYY-MM-DD'
  )
  and (
    private.current_user_role() = 'admin'
    or exists (
      select 1
      from public.student_teachers st
      where st.student_id = bible_learning_records.student_id
        and st.teacher_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.student_guardians sg
      where sg.student_id = bible_learning_records.student_id
        and sg.guardian_id = (select auth.uid())
    )
  )
);

create or replace function public.complete_weekly_bible_lesson(
  p_student_id uuid,
  p_lesson_title text,
  p_verse_ref text,
  p_completed_items integer,
  p_talents_awarded integer default 2
)
returns table(already_completed boolean, lesson_week text, talents_awarded integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_week text := to_char(
    (((now() at time zone 'Asia/Seoul')::date
      - extract(dow from (now() at time zone 'Asia/Seoul')::date)::int)::timestamp),
    'YYYY-MM-DD'
  );
  v_role text := private.current_user_role();
  v_can_complete boolean;
  v_has_bible_record boolean;
  v_has_talent_record boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Login is required.';
  end if;

  if p_talents_awarded <> 2 then
    raise exception 'Bible completion awards exactly 2 talents.';
  end if;

  select exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.is_active = true
      and (
        v_role = 'admin'
        or exists (
          select 1 from public.student_teachers st
          where st.student_id = s.id
            and st.teacher_id = (select auth.uid())
        )
        or exists (
          select 1 from public.student_guardians sg
          where sg.student_id = s.id
            and sg.guardian_id = (select auth.uid())
        )
      )
  ) into v_can_complete;

  if not v_can_complete then
    raise exception 'This account is not connected to the selected student.';
  end if;

  select exists (
    select 1
    from public.talent_transactions tt
    where tt.student_id = p_student_id
      and tt.amount = 2
      and tt.reason = U&'\C131\ACBD\D559\C2B5'
      and to_char(
        (((tt.created_at at time zone 'Asia/Seoul')::date
          - extract(dow from (tt.created_at at time zone 'Asia/Seoul')::date)::int)::timestamp),
        'YYYY-MM-DD'
      ) = v_week
  ) into v_has_talent_record;

  if v_has_talent_record then
    already_completed := true;
    lesson_week := v_week;
    talents_awarded := 0;
    return next;
    return;
  end if;

  select exists (
    select 1
    from public.bible_learning_records blr
    where blr.student_id = p_student_id
      and blr.lesson_week = v_week
  ) into v_has_bible_record;

  if not v_has_bible_record then
    insert into public.bible_learning_records (
      student_id,
      teacher_id,
      lesson_title,
      verse_ref,
      completed_items,
      talents_awarded,
      lesson_week
    ) values (
      p_student_id,
      (select auth.uid()),
      p_lesson_title,
      p_verse_ref,
      p_completed_items,
      2,
      v_week
    );
  end if;

  insert into public.talent_transactions (
    student_id,
    teacher_id,
    amount,
    reason,
    memo
  ) values (
    p_student_id,
    (select auth.uid()),
    2,
    U&'\C131\ACBD\D559\C2B5',
    p_lesson_title || U&' \C8FC\AC04 \D559\C2B5 \C644\B8CC'
  );

  already_completed := false;
  lesson_week := v_week;
  talents_awarded := 2;
  return next;
exception
  when unique_violation then
    insert into public.talent_transactions (
      student_id,
      teacher_id,
      amount,
      reason,
      memo
    )
    select
      p_student_id,
      (select auth.uid()),
      2,
      U&'\C131\ACBD\D559\C2B5',
      p_lesson_title || U&' \C8FC\AC04 \D559\C2B5 \C644\B8CC'
    where not exists (
      select 1
      from public.talent_transactions tt
      where tt.student_id = p_student_id
        and tt.amount = 2
        and tt.reason = U&'\C131\ACBD\D559\C2B5'
        and to_char(
          (((tt.created_at at time zone 'Asia/Seoul')::date
            - extract(dow from (tt.created_at at time zone 'Asia/Seoul')::date)::int)::timestamp),
          'YYYY-MM-DD'
        ) = v_week
    );

    already_completed := false;
    lesson_week := v_week;
    talents_awarded := 2;
    return next;
end;
$$;

revoke all on function public.complete_weekly_bible_lesson(uuid, text, text, integer, integer) from public, anon;
grant execute on function public.complete_weekly_bible_lesson(uuid, text, text, integer, integer) to authenticated;
