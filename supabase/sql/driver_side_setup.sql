-- Driver-side data model and RLS scaffolding

-- Device tokens for push notifications
create table if not exists public.device_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  platform text check (platform in ('ios','android','web')) not null,
  token text not null,
  updated_at timestamptz not null default now()
);

-- Shopping requests posted by customers
create table if not exists public.shopping_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  store_name text,
  store_lat double precision,
  store_lng double precision,
  dropoff_address text,
  dropoff_lat double precision,
  dropoff_lng double precision,
  subtotal_fees numeric not null default 0,
  service_fee numeric not null default 0,
  pick_pack_fee numeric not null default 0,
  tip numeric not null default 0,
  confirmed boolean not null default false,
  status text not null default 'pending' check (status in ('pending','accepted','cancelled','completed')),
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- Request items
create table if not exists public.shopping_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.shopping_requests(id) on delete cascade,
  title text not null,
  qty integer not null default 1
);

-- RLS
alter table public.device_tokens enable row level security;
alter table public.shopping_requests enable row level security;
alter table public.shopping_request_items enable row level security;

-- Simplified policies (adjust as needed)
-- Device tokens: users can upsert their own row
drop policy if exists device_tokens_self on public.device_tokens;
create policy device_tokens_self on public.device_tokens
as permissive for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Requests: customers can insert/select their own; providers can select pending
drop policy if exists req_customer_rw on public.shopping_requests;
create policy req_customer_rw on public.shopping_requests
as permissive for select using (customer_id = auth.uid())
with check (customer_id = auth.uid());

drop policy if exists req_provider_read_pending on public.shopping_requests;
create policy req_provider_read_pending on public.shopping_requests
as permissive for select
to authenticated
using (status = 'pending');

-- Items: visible to request owner; providers can read items for pending/accepted
drop policy if exists items_customer_rw on public.shopping_request_items;
create policy items_customer_rw on public.shopping_request_items
as permissive for select using (exists (
  select 1 from public.shopping_requests r where r.id = request_id and r.customer_id = auth.uid()
)) with check (exists (
  select 1 from public.shopping_requests r where r.id = request_id and r.customer_id = auth.uid()
));

drop policy if exists items_provider_read on public.shopping_request_items;
create policy items_provider_read on public.shopping_request_items
as permissive for select
to authenticated
using (exists (
  select 1 from public.shopping_requests r where r.id = request_id and r.status in ('pending','accepted')
));

-- Minimal indexes
create index if not exists idx_requests_status on public.shopping_requests(status);
create index if not exists idx_requests_created_at on public.shopping_requests(created_at desc);

-- Online provider presence + location
create table if not exists public.provider_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  online boolean not null default false,
  lat double precision,
  lng double precision,
  service_radius_km double precision not null default 10,
  updated_at timestamptz not null default now()
);

alter table public.provider_status enable row level security;

drop policy if exists provider_status_self on public.provider_status;
create policy provider_status_self on public.provider_status
as permissive for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_provider_status_online on public.provider_status(online);
create index if not exists idx_provider_status_updated on public.provider_status(updated_at desc);
