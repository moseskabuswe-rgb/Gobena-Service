-- ============================================================
-- GOBENA SERVICE — Full Supabase SQL Schema
-- Paste this into Supabase > SQL Editor > New Query > Run
-- ============================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Shops (coffee shop partners)
create table public.shops (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  city        text,
  state       text,
  phone       text,
  email       text,
  created_at  timestamptz default now()
);

-- Profiles (extend Supabase auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'partner' check (role in ('admin','partner')),
  shop_id     uuid references public.shops(id) on delete set null,
  created_at  timestamptz default now()
);

-- Equipment
create table public.equipment (
  id              uuid primary key default uuid_generate_v4(),
  shop_id         uuid not null references public.shops(id) on delete cascade,
  name            text not null,
  model           text,
  serial_number   text,
  category        text not null default 'Espresso Machine'
                    check (category in ('Espresso Machine','Grinder','Brewer','Refrigeration','Water System','Other')),
  status          text not null default 'good'
                    check (status in ('good','needs_attention','urgent')),
  install_date    date,
  last_service    date,
  notes           text,
  created_at      timestamptz default now()
);

-- Maintenance Logs
create table public.maintenance_logs (
  id              uuid primary key default uuid_generate_v4(),
  equipment_id    uuid not null references public.equipment(id) on delete cascade,
  performed_by    text not null,
  description     text not null,
  log_type        text not null default 'maintenance'
                    check (log_type in ('maintenance','repair','inspection','install')),
  performed_at    timestamptz default now(),
  created_at      timestamptz default now()
);

-- Service Requests
create table public.service_requests (
  id              uuid primary key default uuid_generate_v4(),
  equipment_id    uuid not null references public.equipment(id) on delete cascade,
  shop_id         uuid not null references public.shops(id) on delete cascade,
  requested_by    uuid references auth.users(id) on delete set null,
  issue_type      text not null,
  notes           text,
  status          text not null default 'open'
                    check (status in ('open','in_progress','resolved','closed')),
  priority        text not null default 'normal'
                    check (priority in ('low','normal','high','urgent')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.shops           enable row level security;
alter table public.profiles        enable row level security;
alter table public.equipment       enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.service_requests enable row level security;

-- Profiles: users see their own, admins see all
create policy "Own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Admin all profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Shops: partners see their own shop, admins see all
create policy "Partner own shop" on public.shops
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.shop_id = id)
    or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin manage shops" on public.shops
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Equipment: partners see own shop, admins see all
create policy "Partner own equipment" on public.equipment
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.shop_id = shop_id
    )
    or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin manage equipment" on public.equipment
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Maintenance logs: inherit equipment access
create policy "View maintenance logs" on public.maintenance_logs
  for select using (
    exists (
      select 1 from public.equipment e
      join public.profiles p on p.id = auth.uid()
      where e.id = equipment_id
      and (p.shop_id = e.shop_id or p.role = 'admin')
    )
  );

create policy "Admin manage logs" on public.maintenance_logs
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Service requests: partners manage their own, admins manage all
create policy "Partner own requests" on public.service_requests
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.shop_id = shop_id
    )
    or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================
-- 4. TRIGGER: auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'partner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 5. SEED DATA
-- ============================================================

-- Shops
insert into public.shops (id, name, address, city, state, phone, email) values
  ('11111111-1111-1111-1111-111111111111', 'Sunrise Café',      '123 Main St',    'Normal',      'IL', '309-555-0101', 'sunrise@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'The Daily Grind',   '456 Elm Ave',    'Bloomington',  'IL', '309-555-0202', 'grind@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'Rooftop Roasters',  '789 Oak Blvd',   'Peoria',       'IL', '309-555-0303', 'rooftop@example.com');

-- Equipment for Sunrise Café
insert into public.equipment (id, shop_id, name, model, serial_number, category, status, install_date, last_service, notes) values
  ('aaaa0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
    'La Marzocco Linea PB', 'Linea PB AV 2-group', 'LM-2023-00421', 'Espresso Machine', 'good',
    '2023-03-15', '2024-11-10', 'Main bar machine. Runs 6am-6pm daily.'),
  ('aaaa0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
    'Mazzer Major Grinder', 'Mazzer Major V', 'MZ-2023-88723', 'Grinder', 'needs_attention',
    '2023-03-15', '2024-09-05', 'Slight grind inconsistency noted at fine settings.'),
  ('aaaa0003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
    'Fetco CBS-2131XTS', 'CBS-2131XTS', 'FT-2022-33190', 'Brewer', 'good',
    '2022-07-20', '2024-10-22', 'Batch brewer for drip coffee program.');

-- Equipment for The Daily Grind
insert into public.equipment (id, shop_id, name, model, serial_number, category, status, install_date, last_service, notes) values
  ('bbbb0001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
    'Synesso MVP Hydra', 'MVP Hydra 2-group', 'SY-2021-55321', 'Espresso Machine', 'urgent',
    '2021-01-10', '2024-06-14', 'Group 2 pressure dropping intermittently. Needs urgent review.'),
  ('bbbb0002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
    'EK43 Grinder', 'Mahlkönig EK43', 'MK-2021-11209', 'Grinder', 'good',
    '2021-01-10', '2024-12-01', NULL);

-- Equipment for Rooftop Roasters
insert into public.equipment (id, shop_id, name, model, serial_number, category, status, install_date, last_service, notes) values
  ('cccc0001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
    'Victoria Arduino Eagle One', 'Eagle One Prima', 'VA-2024-00099', 'Espresso Machine', 'good',
    '2024-04-01', '2024-12-15', 'Brand new install. Running perfectly.'),
  ('cccc0002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
    'Everpure Water Filter System', 'H-300 HSD', 'EP-2024-00311', 'Water System', 'needs_attention',
    '2024-04-01', '2024-10-01', 'Filter cartridge due for replacement.');

-- Maintenance Logs
insert into public.maintenance_logs (equipment_id, performed_by, description, log_type, performed_at) values
  ('aaaa0001-0000-0000-0000-000000000001', 'Gobena Tech - Marcus',
    'Full descale and backflush. Replaced group gaskets and shower screens. Calibrated extraction pressure to 9 bar.', 'maintenance', '2024-11-10 09:00:00'),
  ('aaaa0001-0000-0000-0000-000000000001', 'Gobena Tech - Sara',
    'Quarterly inspection. Cleaned steam wands, checked boiler pressure. All systems normal.', 'inspection', '2024-08-03 10:30:00'),
  ('aaaa0001-0000-0000-0000-000000000001', 'Gobena Install Team',
    'Initial installation. Plumbed to water line, programmed brew ratios for house espresso.', 'install', '2023-03-15 08:00:00'),

  ('aaaa0002-0000-0000-0000-000000000002', 'Gobena Tech - Marcus',
    'Cleaned burrs and grind chamber. Adjusted alignment. Noted slight burr wear, monitoring.', 'maintenance', '2024-09-05 11:00:00'),

  ('bbbb0001-0000-0000-0000-000000000001', 'Gobena Tech - Sara',
    'Emergency visit. Group 2 solenoid replaced. Pressure stabilized. Monitor for recurrence.', 'repair', '2024-06-14 13:00:00'),
  ('bbbb0001-0000-0000-0000-000000000001', 'Gobena Tech - Marcus',
    'Routine 6-month service. Descaled both groups, replaced O-rings.', 'maintenance', '2023-12-20 09:30:00'),

  ('cccc0001-0000-0000-0000-000000000001', 'Gobena Install Team',
    'New equipment installation. Configured brew-by-weight integration with Acaia scale.', 'install', '2024-04-01 07:00:00'),
  ('cccc0001-0000-0000-0000-000000000001', 'Gobena Tech - Sara',
    'First scheduled service. All groups calibrated. Cleaned heat exchangers.', 'maintenance', '2024-12-15 09:00:00');

-- Service Requests
insert into public.service_requests (equipment_id, shop_id, issue_type, notes, status, priority, created_at) values
  ('bbbb0001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
    'Pressure Issue', 'Group 2 is dropping to ~7 bar mid-pull. Getting inconsistent shots. Happens every 3-4 pulls.', 'open', 'urgent', '2025-01-08 07:45:00'),
  ('aaaa0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
    'Grind Inconsistency', 'Having to adjust grind every hour. Output not staying consistent throughout the day.', 'in_progress', 'normal', '2025-01-06 08:10:00'),
  ('cccc0002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
    'Filter Replacement Needed', 'TDS is climbing. Pretty sure the filter is maxed out. Need a replacement cartridge installed.', 'open', 'normal', '2025-01-05 14:30:00');
