-- ============================================================
-- Gobena Service — Complete Database Schema v2
-- Run this in Supabase SQL Editor (safe to re-run with IF NOT EXISTS)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── shops ───────────────────────────────────────────────────────────────────
create table if not exists shops (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  address         text not null default '',
  city            text not null default '',
  state           text not null default '',
  contact_name    text not null default '',
  contact_email   text not null default '',
  contact_phone   text not null default '',
  status          text not null default 'pending' check (status in ('pending','approved','suspended')),
  approved_at     timestamptz,
  approved_by     uuid references auth.users(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  shop_id     uuid references shops(id) on delete set null,
  role        text not null default 'partner' check (role in ('admin','partner')),
  full_name   text not null default '',
  created_at  timestamptz not null default now()
);

-- ─── equipment ───────────────────────────────────────────────────────────────
create table if not exists equipment (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references shops(id) on delete cascade,
  name              text not null,
  brand             text not null default '',
  model             text not null default '',
  serial_number     text,
  install_date      date,
  last_service_date date,
  next_service_date date,
  status            text not null default 'operational' check (status in ('operational','needs_attention','out_of_service')),
  notes             text,
  created_at        timestamptz not null default now()
);

-- ─── issues ──────────────────────────────────────────────────────────────────
create table if not exists issues (
  id               uuid primary key default gen_random_uuid(),
  equipment_id     uuid not null references equipment(id) on delete cascade,
  shop_id          uuid not null references shops(id) on delete cascade,
  reported_by      uuid references auth.users(id) on delete set null,
  reporter_name    text,
  reporter_email   text,
  title            text not null,
  description      text not null default '',
  severity         text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status           text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  photo_urls       text[],
  resolution_notes text,
  resolved_at      timestamptz,
  resolved_by      uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ─── checklist_completions ───────────────────────────────────────────────────
create table if not exists checklist_completions (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references shops(id) on delete cascade,
  completed_by    uuid not null references auth.users(id) on delete cascade,
  checklist_type  text not null check (checklist_type in ('opening','closing','weekly')),
  items           jsonb not null default '[]',
  date            date not null,
  created_at      timestamptz not null default now(),
  -- One completion record per shop per type per day
  unique (shop_id, checklist_type, date)
);

-- ─── maintenance_logs ────────────────────────────────────────────────────────
create table if not exists maintenance_logs (
  id                uuid primary key default gen_random_uuid(),
  equipment_id      uuid not null references equipment(id) on delete cascade,
  shop_id           uuid not null references shops(id) on delete cascade,
  logged_by         uuid not null references auth.users(id) on delete cascade,
  type              text not null default 'routine' check (type in ('routine','repair','inspection','cleaning')),
  description       text not null,
  performed_by      text not null default '',
  performed_at      timestamptz not null default now(),
  next_service_date date,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table shops                 enable row level security;
alter table profiles              enable row level security;
alter table equipment             enable row level security;
alter table issues                enable row level security;
alter table checklist_completions enable row level security;
alter table maintenance_logs      enable row level security;

-- Drop existing policies first so re-runs are safe
do $$ begin
  -- shops
  drop policy if exists "Admin full access shops" on shops;
  drop policy if exists "Partners read own shop" on shops;
  drop policy if exists "Anyone can insert shop (registration)" on shops;
  -- profiles
  drop policy if exists "Admin full access profiles" on profiles;
  drop policy if exists "Partner reads own profile" on profiles;
  drop policy if exists "New user inserts own profile" on profiles;
  -- equipment
  drop policy if exists "Admin full access equipment" on equipment;
  drop policy if exists "Partner reads own shop equipment" on equipment;
  drop policy if exists "Public read equipment by id" on equipment;
  -- issues
  drop policy if exists "Admin full access issues" on issues;
  drop policy if exists "Partner reads own shop issues" on issues;
  drop policy if exists "Anyone can insert issue" on issues;
  -- checklist_completions
  drop policy if exists "Admin full access checklists" on checklist_completions;
  drop policy if exists "Partner manages own shop checklists" on checklist_completions;
  -- maintenance_logs
  drop policy if exists "Admin full access logs" on maintenance_logs;
  drop policy if exists "Partner manages own shop logs" on maintenance_logs;
end $$;

-- ─── shops policies ──────────────────────────────────────────────────────────
-- Admin: full access
create policy "Admin full access shops"
  on shops for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Partners: read their own shop
create policy "Partners read own shop"
  on shops for select
  using (id in (select shop_id from profiles where id = auth.uid()));

-- Anyone (including unauthenticated): can insert a shop (self-registration)
create policy "Anyone can insert shop (registration)"
  on shops for insert
  with check (true);

-- ─── profiles policies ───────────────────────────────────────────────────────
-- Admin: full access
create policy "Admin full access profiles"
  on profiles for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Partners: read own profile
create policy "Partner reads own profile"
  on profiles for select
  using (auth.uid() = id);

-- New user: insert their own profile
create policy "New user inserts own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ─── equipment policies ──────────────────────────────────────────────────────
-- Admin: full access
create policy "Admin full access equipment"
  on equipment for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Partners: read their shop's equipment
create policy "Partner reads own shop equipment"
  on equipment for select
  using (shop_id in (select shop_id from profiles where id = auth.uid()));

-- Public (unauthenticated): read any equipment by id (for QR scans)
create policy "Public read equipment by id"
  on equipment for select
  using (true);

-- ─── issues policies ─────────────────────────────────────────────────────────
-- Admin: full access
create policy "Admin full access issues"
  on issues for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Partners: read their shop's issues
create policy "Partner reads own shop issues"
  on issues for select
  using (shop_id in (select shop_id from profiles where id = auth.uid()));

-- Anyone (including unauthenticated / guest reporters): insert issues
create policy "Anyone can insert issue"
  on issues for insert
  with check (true);

-- ─── checklist_completions policies ─────────────────────────────────────────
-- Admin: full access
create policy "Admin full access checklists"
  on checklist_completions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Partners: manage their own shop's checklists
create policy "Partner manages own shop checklists"
  on checklist_completions for all
  using (shop_id in (select shop_id from profiles where id = auth.uid()))
  with check (shop_id in (select shop_id from profiles where id = auth.uid()));

-- ─── maintenance_logs policies ───────────────────────────────────────────────
-- Admin: full access
create policy "Admin full access logs"
  on maintenance_logs for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Partners: manage their own shop's logs
create policy "Partner manages own shop logs"
  on maintenance_logs for all
  using (shop_id in (select shop_id from profiles where id = auth.uid()))
  with check (shop_id in (select shop_id from profiles where id = auth.uid()));

-- ============================================================
-- Supabase Storage bucket for issue photos
-- ============================================================
-- Run this separately if the bucket doesn't exist yet:
-- insert into storage.buckets (id, name, public) values ('issue-photos', 'issue-photos', true)
-- on conflict do nothing;

-- Storage policy (run after creating the bucket):
-- create policy "Anyone can upload issue photos"
--   on storage.objects for insert
--   with check (bucket_id = 'issue-photos');

-- create policy "Public read issue photos"
--   on storage.objects for select
--   using (bucket_id = 'issue-photos');

-- ============================================================
-- Seed your admin profile (run AFTER creating your auth account)
-- Replace the UUID with your actual user ID from Supabase Auth
-- ============================================================
-- insert into profiles (id, role, full_name)
-- values ('8e3cb8fc-19d1-4f34-969c-649c322b385e', 'admin', 'Moses')
-- on conflict (id) do update set role = 'admin';
