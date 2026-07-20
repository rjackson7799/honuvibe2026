-- 063_site_settings.sql
--
-- Single-row site configuration. Currently drives the site-wide marketing
-- announcement strip (components/marketing/event-strip.tsx): whether it shows
-- and which hand-authored public event (lib/events/public-events.ts) it
-- features. Event *content* stays in code; only visibility + selection live here
-- so an admin can flip the banner without a deploy.
--
-- Singleton pattern: a boolean PK fixed to `true` guarantees at most one row
-- (deliberate deviation from the UUID-PK convention — this is a config row, not
-- user data). Read publicly via the anon key; written only via the service-role
-- admin client (see lib/marketing/actions.ts), so no write policy is needed.

create table if not exists public.site_settings (
  id                boolean primary key default true,
  banner_enabled    boolean not null default false,
  banner_event_slug text,
  updated_at        timestamptz not null default now(),
  constraint site_settings_singleton check (id = true)
);

-- Seed the single row. Banner starts OFF so nothing shows until an admin opts in
-- (this also hides any stale/past event on first deploy).
insert into public.site_settings (id, banner_enabled, banner_event_slug)
values (true, false, 'ai-prompting-jumpstart')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

-- Public marketing pages read the banner flag with the anon key.
drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read"
  on public.site_settings for select
  using (true);

-- No insert/update/delete policy: all writes go through the service-role client,
-- which bypasses RLS. This keeps the table read-only to anon/authenticated users.
