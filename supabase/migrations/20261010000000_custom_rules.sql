-- Training rules become a free-text list the AI follows in every plan.
-- The "no warm-up" and "abs finisher" switches and the "Anything else?" note
-- move into that list; the avoid list (avoid_terms) stays separate because
-- code enforces it.

alter table training_rules add column rules text[] not null default '{}';

update training_rules t
set rules = array_remove(array[
  case when t.no_warmup then
    case when p.locale = 'uk' then 'Без розминки — одразу робоча вага' else 'No warm-up — start with working weight' end
  end,
  case when t.abs_finisher then
    case when p.locale = 'uk' then 'Завжди завершувати блоком вправ на прес' else 'Always finish with an abs block' end
  end,
  nullif(trim(t.notes), '')
], null)
from profile p
where t.id = 1 and p.id = 1;

-- complete_onboarding wrote the old columns; replace it before dropping them.
drop function complete_onboarding(
  text, sex, smallint, numeric, numeric, training_level, goal, app_locale, smallint,
  jsonb, boolean, boolean, text[], text, uuid[], text[], text
);

alter table training_rules
  drop column no_warmup,
  drop column abs_finisher,
  drop column notes;

-- Same as before, with p_rules in place of the two switches and the note.
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
  p_rules text[],
  p_avoid_terms text[],
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
    rules = coalesce(p_rules, '{}'),
    avoid_terms = coalesce(p_avoid_terms, '{}')
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
