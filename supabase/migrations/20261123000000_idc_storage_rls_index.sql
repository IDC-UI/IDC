-- IDC Storage RLS Index Optimization (speed-engineer & supabase-postgres-best-practices)
-- Uses indexed storage.objects.owner = (select auth.uid()) before foldername string splitting
-- so the 200-file upload cap evaluation uses an Index Scan instead of scanning folder strings.

drop policy if exists "Users can upload encrypted files to their folder" on storage.objects;
create policy "Users can upload encrypted files to their folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'idc-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.enc$'
  and (
    select count(*) from storage.objects o
    where o.bucket_id = 'idc-vault'
      and o.owner = (select auth.uid())
      and (storage.foldername(o.name))[1] = (select auth.uid())::text
  ) < 200
);
