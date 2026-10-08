-- FUTBOLVERDADERO ENTRENADORES · tabla de membresías
-- Ejecutar en Supabase → SQL Editor (proyecto de la zona de entrenadores).

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid,
  ls_subscription_id text,
  ls_customer_id text,
  status text not null default 'none',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.memberships is
  'Estado de suscripción sincronizado desde Lemon Squeezy (webhook, service_role).';

alter table public.memberships enable row level security;

-- Los socios solo pueden leer SU fila; escribir únicamente el webhook (service_role
-- bypasea RLS). No hay políticas de insert/update/delete para roles anónimos.
drop policy if exists memberships_select_own on public.memberships;
create policy memberships_select_own
  on public.memberships
  for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create index if not exists memberships_ls_subscription_idx
  on public.memberships (ls_subscription_id);
