-- Pilot requests from the landing page form (/#pilot).
-- Anyone may insert. Nobody may read through the API: the team reads rows in the
-- Supabase dashboard or with the service role, which bypasses RLS.

create table if not exists public.pilot_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 1 and 200),
  email text not null check (char_length(email) <= 320 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  lgu text not null check (char_length(lgu) between 1 and 200),
  role text not null check (role in (
    'Barangay official',
    'LGU disaster office (MDRRMO or CDRRMO)',
    'Other LGU staff',
    'Other'
  )),
  message text check (char_length(message) <= 4000),
  consent boolean not null check (consent)
);

alter table public.pilot_requests enable row level security;

drop policy if exists "pilot_requests_insert_only" on public.pilot_requests;
create policy "pilot_requests_insert_only"
  on public.pilot_requests
  for insert
  to anon, authenticated
  with check (true);

-- No select, update or delete policies: those are denied under RLS.
revoke select, update, delete on public.pilot_requests from anon, authenticated;
grant insert on public.pilot_requests to anon, authenticated;
