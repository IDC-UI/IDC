-- IDC Postgres Best Practices Migration (supabase-postgres-best-practices)
-- 1) query-missing-indexes: Covering & descending indexes for hot lookups
create index if not exists idx_idc_rate_limits_window
  on public.idc_rate_limits (user_id, bucket, window_start);

create index if not exists idx_idc_vaults_updated_at
  on public.idc_vaults (updated_at desc);

-- 2) security-rls-initplan: Evaluate (select auth.uid()) once per query via InitPlan
create or replace function public.idc_rate_hit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
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

-- 3) schema-triggers: Keep updated_at fresh automatically on every vault update
create or replace function public.idc_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_idc_vaults_updated_at on public.idc_vaults;
create trigger trg_idc_vaults_updated_at
before update on public.idc_vaults
for each row execute function public.idc_touch_updated_at();
