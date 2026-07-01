create table if not exists public.story_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.story_posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_likes (
  post_id uuid not null references public.story_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists story_posts_active_created_idx
on public.story_posts(is_active, created_at desc);

create index if not exists story_comments_post_created_idx
on public.story_comments(post_id, created_at);

create index if not exists story_likes_user_idx
on public.story_likes(user_id);

grant select, insert, update, delete on public.story_posts to authenticated;
grant select, insert, update, delete on public.story_comments to authenticated;
grant select, insert, delete on public.story_likes to authenticated;

alter table public.story_posts enable row level security;
alter table public.story_comments enable row level security;
alter table public.story_likes enable row level security;

drop policy if exists "approved users can read story posts" on public.story_posts;
create policy "approved users can read story posts"
on public.story_posts for select
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher', 'guardian')
  and (is_active = true or private.current_user_role() = 'admin')
);

drop policy if exists "approved users can insert story posts" on public.story_posts;
create policy "approved users can insert story posts"
on public.story_posts for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and private.current_user_role() in ('admin', 'teacher', 'guardian')
);

drop policy if exists "owners and admins can update story posts" on public.story_posts;
create policy "owners and admins can update story posts"
on public.story_posts for update
to authenticated
using (
  private.current_user_role() = 'admin'
  or author_id = (select auth.uid())
)
with check (
  private.current_user_role() = 'admin'
  or author_id = (select auth.uid())
);

drop policy if exists "owners and admins can delete story posts" on public.story_posts;
create policy "owners and admins can delete story posts"
on public.story_posts for delete
to authenticated
using (
  private.current_user_role() = 'admin'
  or author_id = (select auth.uid())
);

drop policy if exists "approved users can read story comments" on public.story_comments;
create policy "approved users can read story comments"
on public.story_comments for select
to authenticated
using (
  private.current_user_role() in ('admin', 'teacher', 'guardian')
  and (is_active = true or private.current_user_role() = 'admin')
);

drop policy if exists "approved users can insert story comments" on public.story_comments;
create policy "approved users can insert story comments"
on public.story_comments for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and private.current_user_role() in ('admin', 'teacher', 'guardian')
);

drop policy if exists "owners and admins can update story comments" on public.story_comments;
create policy "owners and admins can update story comments"
on public.story_comments for update
to authenticated
using (
  private.current_user_role() = 'admin'
  or author_id = (select auth.uid())
)
with check (
  private.current_user_role() = 'admin'
  or author_id = (select auth.uid())
);

drop policy if exists "owners and admins can delete story comments" on public.story_comments;
create policy "owners and admins can delete story comments"
on public.story_comments for delete
to authenticated
using (
  private.current_user_role() = 'admin'
  or author_id = (select auth.uid())
);

drop policy if exists "approved users can read story likes" on public.story_likes;
create policy "approved users can read story likes"
on public.story_likes for select
to authenticated
using (private.current_user_role() in ('admin', 'teacher', 'guardian'));

drop policy if exists "approved users can insert own story likes" on public.story_likes;
create policy "approved users can insert own story likes"
on public.story_likes for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.current_user_role() in ('admin', 'teacher', 'guardian')
);

drop policy if exists "owners and admins can delete story likes" on public.story_likes;
create policy "owners and admins can delete story likes"
on public.story_likes for delete
to authenticated
using (
  user_id = (select auth.uid())
  or private.current_user_role() = 'admin'
);
