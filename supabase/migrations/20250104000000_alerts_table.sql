-- Layer 1: Alert Ingestion schema
-- Stores ingested CAP weather alerts from PAGASA/NDRRMC/PHIVOLCS

create table alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null,                    -- 'PAGASA', 'NDRRMC', 'PHIVOLCS'
  cap_identifier text,                     -- CAP alert identifier
  event_type text not null,                -- 'typhoon', 'flood', 'earthquake', 'volcanic'
  severity text not null,                  -- 'Extreme', 'Severe', 'Moderate', 'Minor'
  urgency text not null default 'Immediate',
  headline text not null,
  description text,
  effective_at timestamptz not null,
  expires_at timestamptz,
  psgc_codes text[] not null default '{}', -- target barangay PSGC codes
  raw_payload jsonb not null,              -- full CAP payload for audit
  threshold_met boolean not null default false,
  campaign_id uuid references campaigns(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_alerts_psgc on alerts using gin (psgc_codes);
create index idx_alerts_created on alerts (created_at desc);

-- Add alert linkage columns to campaigns
alter table campaigns add column if not exists alert_id uuid references alerts(id) on delete set null;
alter table campaigns add column if not exists ai_generated boolean not null default false;
