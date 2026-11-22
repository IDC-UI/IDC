-- IDC Per-User Routes & Anti-IDOR Authorization Table (supabase-postgres-best-practices)
create table if not exists public.idc_user_routes (
  route_id text primary key check (route_id ~ '^[a-z0-9_-]{3,24}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  public_em jsonb not null default '{}'::jsonb,
  card_gate jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_idc_user_routes_user_id
  on public.idc_user_routes (user_id);

alter table public.idc_user_routes enable row level security;

-- Prevent direct enumeration or scraping of user routes by anon/public roles
revoke all on table public.idc_user_routes from public, anon;
grant select, insert, update, delete on table public.idc_user_routes to authenticated;

-- RLS Policies with (select auth.uid()) initPlan caching: users can only read/write their OWN route row directly
create policy "Users can read their own route"
on public.idc_user_routes for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can claim their own route"
on public.idc_user_routes for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own route"
on public.idc_user_routes for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete their own route"
on public.idc_user_routes for delete to authenticated
using (user_id = (select auth.uid()));

-- SECURITY DEFINER route resolution function called by the authorize-route Edge Function Middleware.
-- Never returns user_id or private vault data; only returns ownership status and public emergency/gate metadata.
create or replace function public.idc_resolve_route(p_route_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_row public.idc_user_routes%rowtype;
begin
  if p_route_id is null or p_route_id !~ '^[a-z0-9_-]{3,24}$' then
    return jsonb_build_object('exists', false, 'is_owner', false);
  end if;

  select * into v_row
  from public.idc_user_routes
  where route_id = lower(p_route_id);

  if not found then
    return jsonb_build_object('exists', false, 'is_owner', false);
  end if;

  return jsonb_build_object(
    'exists', true,
    'route_id', v_row.route_id,
    'is_owner', (v_caller is not null and v_caller = v_row.user_id),
    'public_em', coalesce(v_row.public_em, '{}'::jsonb),
    'card_gate', coalesce(v_row.card_gate, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.idc_resolve_route(text) from public, anon;
grant execute on function public.idc_resolve_route(text) to authenticated;
