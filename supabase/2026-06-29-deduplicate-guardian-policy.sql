drop policy if exists "guardians can read own links" on public.student_guardians;
drop policy if exists "admins can manage guardian links" on public.student_guardians;
drop policy if exists "staff guardians can read guardian links" on public.student_guardians;
drop policy if exists "admins can insert guardian links" on public.student_guardians;
drop policy if exists "admins can update guardian links" on public.student_guardians;
drop policy if exists "admins can delete guardian links" on public.student_guardians;

create policy "staff guardians can read guardian links"
on public.student_guardians for select
to authenticated
using (guardian_id = (select auth.uid()) or private.current_user_role() in ('admin', 'teacher'));

create policy "admins can insert guardian links"
on public.student_guardians for insert
to authenticated
with check (private.current_user_role() = 'admin');

create policy "admins can update guardian links"
on public.student_guardians for update
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

create policy "admins can delete guardian links"
on public.student_guardians for delete
to authenticated
using (private.current_user_role() = 'admin');
