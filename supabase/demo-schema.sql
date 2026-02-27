-- Demo schema and seed data for agent-facing APIs
-- Run this in Supabase SQL editor for project: zcxeoyhaxalncltyhpjw

create extension if not exists pgcrypto;

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  product_name text not null,
  model text not null,
  purchase_date date not null,
  warranty_expires_at date not null
);

create index if not exists purchase_orders_user_id_idx
  on public.purchase_orders (user_id);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  request_type text not null check (request_type in ('repair', 'cleaning')),
  product_name text not null,
  model text not null,
  issue_description text not null,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create index if not exists service_requests_user_id_idx
  on public.service_requests (user_id);

insert into public.purchase_orders (user_id, product_name, model, purchase_date, warranty_expires_at)
values
  ('demo-user-a', 'PureAir Pro', 'PA-PRO-2024', '2024-04-15', '2026-04-15'),
  ('demo-user-a', 'PureAir Home', 'PA-HOME-2023', '2023-11-02', '2025-11-02'),
  ('demo-user-b', 'PureAir Max', 'PA-MAX-2025', '2025-01-20', '2027-01-20')
on conflict do nothing;
