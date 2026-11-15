-- IDC hardening: database-side rate limiting, per-user upload cap, stricter grants.

-- 1) Rate-limit counters. No direct access from the API roles; only the SECURITY DEFINER function touches it.
create table if not exists public.idc_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null check (bucket ~ '^[a-z0-9-]{1,40}$'),
  window_start timestamptz not null default now(),
  hits integer not null default 0,
  primary key (user_id, bucket)
);
alter table public.idc_rate_limits enable row level security;
revoke all on table public.idc_rate_limits from public, anon, authenticated;

create or replace function public.idc_rate_hit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_hits integer;
begin
  if v_user is null then
    return false;
  end if;
  if p_bucket !~ '^[a-z0-9-]{1,40}$' or p_max < 1 or p_max > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit arguments';
  end if;

  insert into public.idc_rate_limits as r (user_id, bucket, window_start, hits)
  values (v_user, p_bucket, now(), 1)
  on conflict (user_id, bucket) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                        then now() else r.window_start end,
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                then 1 else r.hits + 1 end
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

revoke all on function public.idc_rate_hit(text, integer, integer) from public, anon;
grant execute on function public.idc_rate_hit(text, integer, integer) to authenticated;

-- 2) Vault table: nothing is reachable by PUBLIC.
revoke all on table public.idc_vaults from public;

-- 3) Storage: path must be <own uid>/<uuid>.enc and a user may hold at most 200 files.
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
      and (storage.foldername(o.name))[1] = (select auth.uid())::text
  ) < 200
);
-- No UPDATE policy exists on purpose: uploaded ciphertext objects are immutable (delete + re-upload only).
