-- Regenerate day / exercise: shared helpers for saving AI output, used by
-- save_generated_week (redefined here) and the two new replace functions.

-- Returns the library id for an AI "new_exercise", adding it (with equipment) if needed.
create function ensure_ai_exercise(n jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into exercises (
    slug, name_en, name_uk, muscle_groups, day_types, default_measure, per_side,
    is_bodyweight, is_abs, technique_en, technique_uk, created_by_ai
  ) values (
    'ai-' || md5(lower(trim(n ->> 'name_en'))),
    trim(n ->> 'name_en'),
    trim(n ->> 'name_uk'),
    array(select jsonb_array_elements_text(n -> 'muscle_groups')),
    array(select jsonb_array_elements_text(n -> 'day_types'))::day_type[],
    (n ->> 'default_measure')::measure,
    (n ->> 'per_side')::boolean,
    (n ->> 'is_bodyweight')::boolean,
    (n ->> 'is_abs')::boolean,
    nullif(n ->> 'technique_en', ''),
    nullif(n ->> 'technique_uk', ''),
    true
  )
  on conflict (slug) do update set slug = excluded.slug
  returning id into v_id;

  insert into exercise_equipment (exercise_id, equipment_id)
  select v_id, q.id from equipment q
  where q.slug in (select jsonb_array_elements_text(n -> 'equipment_slugs'))
  on conflict do nothing;

  return v_id;
end;
$$;

-- Inserts one AI block exercise with its sets into a block.
create function insert_ai_block_exercise(p_block_id uuid, p_position int, e jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_exercise uuid := (e ->> 'exercise_id')::uuid;
  v_be uuid;
begin
  if v_exercise is null then
    v_exercise := ensure_ai_exercise(e -> 'new_exercise');
  end if;

  insert into block_exercises (block_id, exercise_id, position, measure, per_side, technique_note)
  values (p_block_id, v_exercise, p_position, (e ->> 'measure')::measure, (e ->> 'per_side')::boolean,
          nullif(e ->> 'technique_note', ''))
  returning id into v_be;

  insert into sets (block_exercise_id, position, target_kg, target_reps, target_reps_max, target_seconds)
  select v_be, (ord - 1)::smallint, (st ->> 'kg')::numeric, (st ->> 'reps')::smallint,
         coalesce((st ->> 'max')::boolean, false), (st ->> 'seconds')::smallint
  from jsonb_array_elements(e -> 'sets') with ordinality as x(st, ord);

  return v_be;
end;
$$;

-- Inserts AI blocks (with exercises and sets) into a session, in order.
create function insert_ai_blocks(p_session_id uuid, p_blocks jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  b jsonb;
  b_ord int;
  e jsonb;
  e_ord int;
  v_block uuid;
begin
  for b, b_ord in select x.b, x.ord from jsonb_array_elements(p_blocks) with ordinality as x(b, ord) loop
    insert into blocks (session_id, position, kind, role, rounds, rest_sec)
    values (p_session_id, b_ord - 1, (b ->> 'kind')::block_kind, (b ->> 'role')::block_role,
            (b ->> 'rounds')::smallint, (b ->> 'rest_sec')::smallint)
    returning id into v_block;

    for e, e_ord in select y.e, y.ord from jsonb_array_elements(b -> 'exercises') with ordinality as y(e, ord) loop
      perform insert_ai_block_exercise(v_block, e_ord - 1, e);
    end loop;
  end loop;
end;
$$;

-- Same behaviour as before, now built on the helpers.
create or replace function save_generated_week(
  p_week_start date,
  p_model text,
  p_prompt_version text,
  p_sessions jsonb
) returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_week uuid;
  v_session uuid;
  v_saved int := 0;
  s jsonb;
begin
  insert into weeks (start_date) values (p_week_start) on conflict (start_date) do nothing;
  update weeks set model = p_model, prompt_version = p_prompt_version, generated_at = now()
  where start_date = p_week_start
  returning id into v_week;

  for s in select * from jsonb_array_elements(p_sessions) loop
    if exists (select 1 from sessions where week_id = v_week and date = (s ->> 'date')::date) then
      continue;
    end if;
    insert into sessions (week_id, date, day_type, title)
    values (v_week, (s ->> 'date')::date, (s ->> 'day_type')::day_type, nullif(s ->> 'title', ''))
    returning id into v_session;
    perform insert_ai_blocks(v_session, s -> 'blocks');
    v_saved := v_saved + 1;
  end loop;

  return v_saved;
end;
$$;

-- Replaces every block of a planned session with a generated day.
create function replace_session_plan(p_session_id uuid, p_title text, p_blocks jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from sessions where id = p_session_id and status = 'planned') then
    raise exception 'session is not planned';
  end if;
  delete from blocks where session_id = p_session_id;
  update sessions set title = nullif(p_title, '') where id = p_session_id;
  perform insert_ai_blocks(p_session_id, p_blocks);
end;
$$;

-- Replaces one exercise (and its sets) in place, keeping its position.
create function replace_block_exercise(p_id uuid, e jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old block_exercises;
begin
  select be.* into v_old from block_exercises be
  join blocks b on b.id = be.block_id
  join sessions s on s.id = b.session_id
  where be.id = p_id and s.status = 'planned';
  if v_old.id is null then raise exception 'exercise not found in a planned session'; end if;

  delete from block_exercises where id = p_id;
  perform insert_ai_block_exercise(v_old.block_id, v_old.position, e);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'ensure_ai_exercise(jsonb)',
    'insert_ai_block_exercise(uuid, int, jsonb)',
    'insert_ai_blocks(uuid, jsonb)',
    'replace_session_plan(uuid, text, jsonb)',
    'replace_block_exercise(uuid, jsonb)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
