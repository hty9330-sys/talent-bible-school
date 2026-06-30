create table if not exists public.church_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_announcements_active_created_idx
on public.church_announcements(is_active, created_at desc);

grant select, insert, update, delete on public.church_announcements to authenticated;

alter table public.church_announcements enable row level security;

drop policy if exists "authenticated can read church announcements" on public.church_announcements;
create policy "authenticated can read church announcements"
on public.church_announcements for select
to authenticated
using (is_active = true or private.current_user_role() = 'admin');

drop policy if exists "admins can insert church announcements" on public.church_announcements;
create policy "admins can insert church announcements"
on public.church_announcements for insert
to authenticated
with check (private.current_user_role() = 'admin');

drop policy if exists "admins can update church announcements" on public.church_announcements;
create policy "admins can update church announcements"
on public.church_announcements for update
to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

drop policy if exists "admins can delete church announcements" on public.church_announcements;
create policy "admins can delete church announcements"
on public.church_announcements for delete
to authenticated
using (private.current_user_role() = 'admin');
