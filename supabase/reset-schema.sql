-- HANDA Schema Reset
-- Drop existing tables and recreate with correct schema

-- Drop existing tables (in dependency order)
drop table if exists check_in_answers cascade;
drop table if exists check_ins cascade;
drop table if exists campaign_questions cascade;
drop table if exists campaigns cascade;
drop table if exists household_members cascade;
drop table if exists households cascade;
drop table if exists officials cascade;

-- Drop enums
drop type if exists campaign_status cascade;
drop type if exists check_in_status cascade;

-- Recreate enums
create type campaign_status as enum ('draft', 'active', 'closed', 'archived');
create type check_in_status as enum ('unresolved', 'visited', 'resolved');

-- Create tables
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  disaster_type text not null,
  disaster_date date not null,
  status campaign_status not null default 'draft',
  created_by text not null,
  barangay_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_questions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  question_text text not null,
  need_category text not null,
  display_order int not null default 0
);

create table households (
  id uuid primary key default gen_random_uuid(),
  barangay_code text not null,
  household_head_name text not null,
  address text not null,
  member_count int not null default 1
);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  first_name text not null,
  last_name text not null
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  household_id uuid not null references households (id) on delete cascade,
  submitted_by text not null,
  status check_in_status not null default 'unresolved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table check_in_answers (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references check_ins (id) on delete cascade,
  question_id uuid not null references campaign_questions (id) on delete cascade,
  answer text not null
);

create table officials (
  uniqid text primary key,
  barangay_code text not null,
  role text not null default 'official',
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_campaign_questions_campaign on campaign_questions (campaign_id);
create index idx_households_barangay on households (barangay_code);
create index idx_household_members_household on household_members (household_id);
create index idx_check_ins_campaign on check_ins (campaign_id);
create index idx_check_ins_household on check_ins (household_id);
create index idx_check_in_answers_check_in on check_in_answers (check_in_id);

-- Unique constraint for dedup
alter table check_ins
  add constraint check_ins_campaign_household_unique
  unique (campaign_id, household_id);

-- Seed official (Josie - demo official)
insert into officials (uniqid, barangay_code) values ('MVPCBEUVCGPZR', '0105503021');

-- Seed households for Barangay POBLACION (0105503021)
INSERT INTO households (id, barangay_code, household_head_name, address, member_count) VALUES
  ('a0000000-0000-0000-0000-000000000001', '0105503021', 'Santos Household', 'Blk 4 Lot 8, Purok Sampaguita', 4),
  ('a0000000-0000-0000-0000-000000000002', '0105503021', 'Reyes Household', 'Blk 5 Lot 12, Purok Rosal', 3),
  ('a0000000-0000-0000-0000-000000000003', '0105503021', 'Cruz Household', 'Blk 6 Lot 3, Purok Ilang-Ilang', 5),
  ('a0000000-0000-0000-0000-000000000004', '0105503021', 'Garcia Household', 'Blk 7 Lot 15, Purok Dahlia', 2),
  ('a0000000-0000-0000-0000-000000000005', '0105503021', 'Lopez Household', 'Blk 8 Lot 9, Purok Orchid', 6),
  ('a0000000-0000-0000-0000-000000000006', '0105503021', 'Mendoza Household', 'Blk 9 Lot 1, Purok Jasmine', 3),
  ('a0000000-0000-0000-0000-000000000007', '0105503021', 'Torres Household', 'Blk 10 Lot 7, Purok Sunflower', 4),
  ('a0000000-0000-0000-0000-000000000008', '0105503021', 'Ramirez Household', 'Blk 11 Lot 11, Purok Tulip', 2),
  ('a0000000-0000-0000-0000-000000000009', '0105503021', 'Flores Household', 'Blk 12 Lot 4, Purok Daisy', 5),
  ('a0000000-0000-0000-0000-000000000010', '0105503021', 'Aquino Household', 'Blk 13 Lot 6, Purok Lily', 3),
  ('a0000000-0000-0000-0000-000000000011', '0105503021', 'Villanueva Household', 'Blk 14 Lot 10, Purok Rose', 4),
  ('a0000000-0000-0000-0000-000000000012', '0105503021', 'Delos Santos Household', 'Blk 15 Lot 2, Purok Violet', 7);

-- Seed household members
INSERT INTO household_members (id, household_id, first_name, last_name) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'MARIA', 'SANTOS'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'JUAN', 'SANTOS'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ANA', 'SANTOS'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'CARLOS', 'SANTOS'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'PEDRO', 'REYES'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'ROSA', 'REYES'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'MIGUEL', 'REYES'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'JOSE', 'CRUZ'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'ELENA', 'CRUZ'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000004', 'ANTONIO', 'GARCIA'),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000004', 'ISABEL', 'GARCIA'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000005', 'RICARDO', 'LOPEZ'),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000005', 'CARMEN', 'LOPEZ'),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000006', 'EDUARDO', 'MENDOZA'),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000006', 'TERESITA', 'MENDOZA'),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000007', 'FERNANDO', 'TORRES'),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000007', 'LUCIA', 'TORRES'),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000008', 'ALBERTO', 'RAMIREZ'),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000008', 'PILAR', 'RAMIREZ'),
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000009', 'MANUEL', 'FLORES'),
  ('b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000009', 'DOLORES', 'FLORES'),
  ('b0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000010', 'RAFAEL', 'AQUINO'),
  ('b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000010', 'CONSUELO', 'AQUINO'),
  ('b0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000011', 'GREGORIO', 'VILLANUEVA'),
  ('b0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000011', 'ROSARIO', 'VILLANUEVA'),
  ('b0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000012', 'BENJAMIN', 'DELOS SANTOS'),
  ('b0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000012', 'FELICIDAD', 'DELOS SANTOS');

-- Realtime publication
alter publication supabase_realtime add table campaigns;
alter publication supabase_realtime add table check_ins;
alter publication supabase_realtime add table check_in_answers;
