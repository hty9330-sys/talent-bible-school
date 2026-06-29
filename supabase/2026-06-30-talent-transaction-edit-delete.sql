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
