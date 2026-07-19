-- 2026-07-12 학습자료 업로드/다운로드
--  - 관리자가 관리 탭에서 파일(모든 형식)을 업로드하고, 교사 이상이 학습 탭에서 다운로드.
--  - 비공개 버킷 + 서명 URL 다운로드. 메타데이터는 learning_materials 테이블로 관리.

-- 1) 비공개 스토리지 버킷 (파일 형식 제한 없음, 파일당 50MB 제한)
insert into storage.buckets (id, name, public, file_size_limit)
values ('learning-materials', 'learning-materials', false, 52428800)
on conflict (id) do nothing;

-- 2) 스토리지 오브젝트 RLS 정책 (버킷 learning-materials 한정)
drop policy if exists "learning materials read (staff)" on storage.objects;
create policy "learning materials read (staff)"
on storage.objects for select
to authenticated
using (bucket_id = 'learning-materials' and private.current_user_role() in ('admin', 'teacher'));

drop policy if exists "learning materials insert (admin)" on storage.objects;
create policy "learning materials insert (admin)"
on storage.objects for insert
to authenticated
with check (bucket_id = 'learning-materials' and private.current_user_role() = 'admin');

drop policy if exists "learning materials delete (admin)" on storage.objects;
create policy "learning materials delete (admin)"
on storage.objects for delete
to authenticated
using (bucket_id = 'learning-materials' and private.current_user_role() = 'admin');

-- 3) 메타데이터 테이블
create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists learning_materials_created_idx
on public.learning_materials(created_at desc);

grant select, insert, delete on public.learning_materials to authenticated;

alter table public.learning_materials enable row level security;

drop policy if exists "read learning materials (staff)" on public.learning_materials;
create policy "read learning materials (staff)"
on public.learning_materials for select
to authenticated
using (private.current_user_role() in ('admin', 'teacher'));

drop policy if exists "insert learning materials (admin)" on public.learning_materials;
create policy "insert learning materials (admin)"
on public.learning_materials for insert
to authenticated
with check (private.current_user_role() = 'admin' and uploaded_by = (select auth.uid()));

drop policy if exists "delete learning materials (admin)" on public.learning_materials;
create policy "delete learning materials (admin)"
on public.learning_materials for delete
to authenticated
using (private.current_user_role() = 'admin');
