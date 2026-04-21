-- ============================================================
-- GOBENA SERVICE — Patch SQL
-- Run this AFTER the main supabase-schema.sql
-- Fixes:
--   1. Public read on shops (needed for signup shop dropdown)
--   2. Partners can insert service requests for their own shop
--   3. Anyone can insert a maintenance log (used by admin form)
-- ============================================================

-- 1. Allow unauthenticated users to read shops
--    (needed so the signup page can show the shop dropdown before login)
create policy "Public read shops" on public.shops
  for select using (true);

-- 2. Allow partners to insert service requests for their own shop
create policy "Partner insert service requests" on public.service_requests
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.shop_id = shop_id
    )
  );

-- 3. Allow admins to insert maintenance logs
create policy "Admin insert logs" on public.maintenance_logs
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 4. Allow partners to insert maintenance logs (for issue logging)
create policy "Partner insert logs" on public.maintenance_logs
  for insert with check (
    exists (
      select 1 from public.equipment e
      join public.profiles p on p.id = auth.uid()
      where e.id = equipment_id and p.shop_id = e.shop_id
    )
  );
