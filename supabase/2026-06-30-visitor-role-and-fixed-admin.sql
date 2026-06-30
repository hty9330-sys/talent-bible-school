alter table public.users
drop constraint if exists users_role_check;

alter table public.users
add constraint users_role_check
check (role in ('visitor', 'guardian', 'teacher', 'admin'));

update public.users
set role = 'admin'
where email = 'hty9330@gmail.com';

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
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    case when lower(coalesce(new.email, '')) = 'hty9330@gmail.com' then 'admin' else 'visitor' end
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(nullif(public.users.name, ''), excluded.name),
      role = case
        when lower(excluded.email) = 'hty9330@gmail.com' then 'admin'
        else public.users.role
      end;
  return new;
end;
$$;

create or replace function public.prevent_fixed_admin_demotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(old.email, new.email, '')) = 'hty9330@gmail.com' and new.role <> 'admin' then
    raise exception 'The first administrator account cannot be demoted.';
  end if;

  if lower(coalesce(new.email, '')) = 'hty9330@gmail.com' then
    new.role := 'admin';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_fixed_admin_role on public.users;
create trigger protect_fixed_admin_role
before update on public.users
for each row execute function public.prevent_fixed_admin_demotion();

drop policy if exists "authenticated can read weekly bible lessons" on public.weekly_bible_lessons;
drop policy if exists "approved users can read weekly bible lessons" on public.weekly_bible_lessons;
create policy "approved users can read weekly bible lessons"
on public.weekly_bible_lessons for select
to authenticated
using (private.current_user_role() in ('guardian', 'teacher', 'admin'));
