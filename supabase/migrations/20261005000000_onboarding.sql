-- Onboarding: fields the survey in /design collects, equipment catalogue,
-- and one atomic function that saves the whole survey.

create type sex as enum ('female', 'male', 'other');
create type goal as enum ('strength', 'muscle', 'fat', 'general');
create type equipment_category as enum ('free_weights', 'machines', 'cables', 'accessories', 'cardio');

alter table profile add column sex sex;
alter table profile alter column goal type goal using goal::goal;

-- Free-text exercises or equipment to avoid ("Deadlift", "Smith machine").
-- Matched against the library in code and passed to the prompt.
alter table training_rules add column avoid_terms text[] not null default '{}';

alter table equipment
  add column category equipment_category not null default 'accessories',
  add column position smallint not null default 0,
  add column is_custom boolean not null default false;

-- Pasted examples can cover several days, so the type is optional.
alter table examples alter column day_type drop not null;

insert into equipment (slug, name_en, name_uk, category, position) values
  ('dumbbells',          'Dumbbells',             'Гантелі',                    'free_weights', 10),
  ('barbell',            'Barbell',               'Штанга',                     'free_weights', 20),
  ('kettlebells',        'Kettlebells',           'Гирі',                       'free_weights', 30),
  ('ez-bar',             'EZ bar',                'EZ-гриф',                    'free_weights', 40),
  ('leg-press',          'Leg press',             'Жим ногами',                 'machines',     10),
  ('lat-pulldown',       'Lat pulldown',          'Верхня тяга',                'machines',     20),
  ('leg-curl-extension', 'Leg curl / extension',  'Згинання / розгинання ніг',  'machines',     30),
  ('smith-machine',      'Smith machine',         'Тренажер Сміта',             'machines',     40),
  ('cable-station',      'Cable station',         'Блочна станція',             'cables',       10),
  ('cable-crossover',    'Cable crossover',       'Кросовер',                   'cables',       20),
  ('bench',              'Flat / incline bench',  'Лава пряма / похила',        'accessories',  10),
  ('pull-up-bar',        'Pull-up bar',           'Турнік',                     'accessories',  20),
  ('resistance-bands',   'Resistance bands',      'Еспандери-стрічки',          'accessories',  30),
  ('plyo-box',           'Plyo box',              'Плиобокс',                   'accessories',  40)
on conflict (slug) do nothing;

-- Saves the survey in one transaction. Runs as the caller, so RLS applies.
create function complete_onboarding(
  p_display_name text,
  p_sex sex,
  p_birth_year smallint,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_level training_level,
  p_goal goal,
  p_locale app_locale,
  p_session_length_min smallint,
  p_schedule jsonb,          -- [{ "weekday": 0, "day_type": "lower" }, …]
  p_no_warmup boolean,
  p_abs_finisher boolean,
  p_avoid_terms text[],
  p_notes text,
  p_equipment_ids uuid[],
  p_custom_equipment text[],
  p_example text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  custom_slugs text[];
begin
  update profile set
    display_name = p_display_name,
    sex = p_sex,
    birth_year = p_birth_year,
    height_cm = p_height_cm,
    weight_kg = p_weight_kg,
    level = p_level,
    goal = p_goal,
    locale = p_locale,
    session_length_min = p_session_length_min,
    onboarded_at = coalesce(onboarded_at, now())
  where id = 1;

  delete from schedule_days where true;
  insert into schedule_days (weekday, day_type)
  select (d ->> 'weekday')::smallint, (d ->> 'day_type')::day_type
  from jsonb_array_elements(p_schedule) d;

  update training_rules set
    no_warmup = p_no_warmup,
    abs_finisher = p_abs_finisher,
    avoid_terms = coalesce(p_avoid_terms, '{}'),
    notes = nullif(trim(p_notes), '')
  where id = 1;

  select coalesce(array_agg('custom-' || md5(lower(trim(n)))), '{}')
  into custom_slugs
  from unnest(coalesce(p_custom_equipment, '{}')) n;

  insert into equipment (slug, name_en, name_uk, category, position, is_custom)
  select 'custom-' || md5(lower(trim(n))), trim(n), trim(n), 'accessories', 100, true
  from unnest(coalesce(p_custom_equipment, '{}')) n
  on conflict (slug) do nothing;

  update equipment
  set available = (id = any(coalesce(p_equipment_ids, '{}')) or slug = any(custom_slugs))
  where true;

  if nullif(trim(p_example), '') is not null then
    insert into examples (raw_text, source)
    select trim(p_example), 'pasted'
    where not exists (select 1 from examples where raw_text = trim(p_example));
  end if;
end;
$$;

revoke execute on function complete_onboarding from public, anon;
grant execute on function complete_onboarding to authenticated;
