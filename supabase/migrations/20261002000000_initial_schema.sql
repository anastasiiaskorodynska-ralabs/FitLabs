-- FitLabs initial schema.
-- Single-user app: no user_id columns. Sign-ups are disabled in Supabase Auth,
-- so "authenticated" means the one account. RLS allows only that role.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type day_type as enum ('lower', 'upper', 'func', 'full');
create type block_kind as enum ('single', 'superset', 'circuit');
create type block_role as enum ('warmup', 'main', 'finisher');
create type measure as enum ('reps', 'seconds');
create type session_status as enum ('planned', 'done', 'skipped');
create type example_source as enum ('pasted', 'log');
create type training_level as enum ('beginner', 'intermediate', 'advanced');
create type app_locale as enum ('en', 'uk');

-- ---------------------------------------------------------------------------
-- Library
-- ---------------------------------------------------------------------------

create table equipment (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_uk text not null,
  is_cardio_machine boolean not null default false,
  available boolean not null default false,
  created_at timestamptz not null default now()
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_uk text not null,
  muscle_groups text[] not null default '{}',
  day_types day_type[] not null default '{}',
  default_measure measure not null default 'reps',
  per_side boolean not null default false,
  is_bodyweight boolean not null default false,
  is_abs boolean not null default false,
  is_warmup boolean not null default false,
  technique_en text,
  technique_uk text,
  image_urls text[] not null default '{}',
  video_url text,
  created_at timestamptz not null default now()
);

-- An exercise is allowed only if every piece of equipment it needs is available.
-- Exercises with no rows here need no equipment.
create table exercise_equipment (
  exercise_id uuid not null references exercises (id) on delete cascade,
  equipment_id uuid not null references equipment (id) on delete cascade,
  primary key (exercise_id, equipment_id)
);

create index exercise_equipment_equipment_id_idx on exercise_equipment (equipment_id);

-- ---------------------------------------------------------------------------
-- Profile and rules (singleton rows, id is always 1)
-- ---------------------------------------------------------------------------

create table profile (
  id smallint primary key default 1 check (id = 1),
  display_name text,
  birth_year smallint check (birth_year between 1900 and 2100),
  height_cm numeric(5, 1) check (height_cm > 0),
  weight_kg numeric(5, 1) check (weight_kg > 0),
  level training_level not null default 'intermediate',
  goal text,
  locale app_locale not null default 'en',
  session_length_min smallint not null default 60 check (session_length_min between 15 and 180),
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

create table training_rules (
  id smallint primary key default 1 check (id = 1),
  abs_finisher boolean not null default false,
  no_warmup boolean not null default false,
  avoid_cardio_machines boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

create table avoided_exercises (
  exercise_id uuid primary key references exercises (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Weekly schedule: one row per training weekday (0 = Monday … 6 = Sunday).
create table schedule_days (
  weekday smallint primary key check (weekday between 0 and 6),
  day_type day_type not null
);

-- ---------------------------------------------------------------------------
-- Examples the AI copies style from
-- ---------------------------------------------------------------------------

create table examples (
  id uuid primary key default gen_random_uuid(),
  day_type day_type not null,
  title text,
  raw_text text not null check (length(trim(raw_text)) > 0),
  source example_source not null default 'pasted',
  session_id uuid, -- set when saved from a logged session (FK added below)
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Plans: week -> sessions -> blocks -> block_exercises -> sets
-- ---------------------------------------------------------------------------

create table weeks (
  id uuid primary key default gen_random_uuid(),
  start_date date not null unique check (extract(isodow from start_date) = 1), -- Monday
  model text,
  prompt_version text,
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks (id) on delete cascade,
  date date not null,
  day_type day_type not null,
  title text,
  status session_status not null default 'planned',
  duration_min smallint check (duration_min > 0),
  notes text,
  logged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (week_id, date)
);

create index sessions_date_idx on sessions (date);

alter table examples
  add constraint examples_session_id_fkey
  foreign key (session_id) references sessions (id) on delete set null;

create table blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  position smallint not null check (position >= 0),
  kind block_kind not null default 'single',
  role block_role not null default 'main',
  rounds smallint check (rounds > 0),
  rest_sec smallint check (rest_sec >= 0), -- circuits: rest between rounds
  unique (session_id, position),
  check ((kind = 'circuit') = (rounds is not null))
);

create table block_exercises (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references blocks (id) on delete cascade,
  exercise_id uuid not null references exercises (id) on delete restrict,
  position smallint not null check (position >= 0),
  measure measure not null default 'reps',
  per_side boolean not null default false,
  rest_sec smallint check (rest_sec >= 0), -- single/superset: rest after each set
  technique_note text,
  unique (block_id, position)
);

create index block_exercises_exercise_id_idx on block_exercises (exercise_id);

-- One row per set. In a circuit, one row per round.
-- target_kg / actual_kg null = bodyweight. target_reps_max = "max" reps.
-- Reps or seconds follows block_exercises.measure; per_side means reps per side.
create table sets (
  id uuid primary key default gen_random_uuid(),
  block_exercise_id uuid not null references block_exercises (id) on delete cascade,
  position smallint not null check (position >= 0),
  target_kg numeric(6, 2) check (target_kg >= 0),
  target_reps smallint check (target_reps > 0),
  target_reps_max boolean not null default false,
  target_seconds smallint check (target_seconds > 0),
  actual_kg numeric(6, 2) check (actual_kg >= 0),
  actual_reps smallint check (actual_reps >= 0),
  actual_seconds smallint check (actual_seconds >= 0),
  completed boolean,
  unique (block_exercise_id, position),
  check (not (target_reps_max and target_reps is not null)),
  check (not (target_seconds is not null and (target_reps is not null or target_reps_max)))
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create function set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profile_set_updated_at before update on profile
  for each row execute function set_updated_at();
create trigger training_rules_set_updated_at before update on training_rules
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: only the signed-in account, never anon
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'equipment', 'exercises', 'exercise_equipment', 'profile', 'training_rules',
    'avoided_exercises', 'schedule_days', 'examples', 'weeks', 'sessions',
    'blocks', 'block_exercises', 'sets'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Singleton rows
-- ---------------------------------------------------------------------------

insert into profile (id) values (1);
insert into training_rules (id) values (1);
