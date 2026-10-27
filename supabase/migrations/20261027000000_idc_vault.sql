create table if not exists public.idc_vaults (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null check (salt ~ '^[A-Za-z0-9_-]{22}$'),
  ciphertext text not null check (
    length(ciphertext) between 40 and 8000000
    and ciphertext ~ '^[A-Za-z0-9_-]+$'
  ),
  updated_at timestamptz not null default now()
);

alter table public.idc_vaults enable row level security;
revoke all on table public.idc_vaults from anon;
grant select, insert, update on table public.idc_vaults to authenticated;

create policy "Users can read their encrypted vault"
on public.idc_vaults for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their encrypted vault"
on public.idc_vaults for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their encrypted vault"
on public.idc_vaults for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('idc-vault', 'idc-vault', false, 5242913, array['application/octet-stream'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242913,
  allowed_mime_types = array['application/octet-stream'];

create policy "Users can upload encrypted files to their folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'idc-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can read encrypted files from their folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'idc-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete encrypted files from their folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'idc-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
