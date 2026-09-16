-- ============================================================
-- Gobena Service — RLS fix migration (DRAFT — review before applying)
-- Run in Supabase SQL Editor AFTER supabase-schema.sql and supabase-patch.sql
--
-- Fixes two issues found in a code+schema audit:
--
--   1. `equipment`'s "Public read equipment by id" policy is
--      `for select using (true)` with no role restriction, which in
--      Postgres/Supabase defaults to the `public` pseudo-role — i.e. it
--      applies to `anon` AND `authenticated`. Combined (OR'd) with the
--      shop-scoped partner policy, this means ANY logged-in partner can
--      run an unfiltered `select * from equipment` and get every shop's
--      machines, not just their own. RLS can't tell "give me row X" apart
--      from "give me all rows" — it evaluates per-row — so the fix is to
--      restrict the public policy to the `anon` role only. The QR-scan
--      flow (which genuinely needs unauthenticated-by-id reads) keeps
--      working exactly as before; authenticated partners fall back to the
--      shop-scoped policy only, closing the cross-tenant read.
--
--   2. `issues` has no SELECT policy usable by an unauthenticated reader
--      at all. EquipmentDetailPage (the public QR-scan page) queries
--      `issues` with a throwaway anonymous client — even when the visitor
--      is a logged-in partner, since that client never carries their
--      session — so RLS silently returns zero rows today. Net effect: the
--      "open issues" / "past issues" history on that page is empty for
--      everyone, always. Fix mirrors #1: allow `anon` to read issues,
--      scoped to the same "equipment id is a public identifier" tradeoff
--      the QR flow already accepts, without widening authenticated access.
--
-- Neither fix touches auth flow config, and neither changes what an
-- anonymous QR scanner can already see — equipment and its issue history
-- are meant to be publicly readable by anyone holding the physical QR
-- code. What changes is that AUTHENTICATED partners no longer inherit that
-- same public-read grant on top of their own shop-scoped policy.
-- ============================================================

-- ─── 1. Equipment: scope public read to the anon role only ────────────────────
drop policy if exists "Public read equipment by id" on equipment;

create policy "Public read equipment by id"
  on equipment for select
  to anon
  using (true);

comment on policy "Public read equipment by id" on equipment is
  'Unauthenticated QR-scan reads only. Authenticated partners/admins are '
  'governed by their own shop-scoped / admin-full-access policies below — '
  'do not widen this to `to public` again, that was the tenant-isolation bug.';

-- ─── 2. Issues: add the missing anon SELECT, scoped the same way ──────────────
create policy "Public read issues for QR scan"
  on issues for select
  to anon
  using (true);

comment on policy "Public read issues for QR scan" on issues is
  'Unauthenticated QR-scan reads only, mirroring "Public read equipment by '
  'id". Issue rows include reporter name/email and free-text description — '
  'if that should not be publicly visible, replace this with a '
  'security-definer RPC that returns a narrower column set instead.';

-- ============================================================
-- ⚠️ Before applying: this repo's local schema files do not define
-- `messages`, `notifications`, or the `create_admin_notification` RPC that
-- the live app depends on — meaning the live database has drifted from
-- what's checked into version control. I have NOT been able to verify
-- these two fixes against the live database's actual current policies
-- (the Supabase project is paused, and restoring it is blocked on a
-- free-tier project-count decision that's pending your call). Please
-- confirm these policy names match what's actually deployed — or better,
-- run `select * from pg_policies where tablename in ('equipment','issues')`
-- against the live project first — before applying this to production.
-- ============================================================
