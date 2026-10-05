-- AI week generation: mark AI-created exercises and save a validated plan atomically.

alter table exercises add column created_by_ai boolean not null default false;

-- Saves a validated plan (see lib/ai/save.ts for the JSON shape).
-- Dates that already have a session are skipped, so nothing logged is overwritten.
-- New exercises are added to the library (slug "ai-<md5 of name_en>") with their equipment.
create function save_generated_week(
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
  v_block uuid;
  v_be uuid;
  v_exercise uuid;
  v_saved int := 0;
  s jsonb;
  b jsonb;
  e jsonb;
  n jsonb;
  st jsonb;
  b_pos int;
  e_pos int;
  s_pos int;
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
    v_saved := v_saved + 1;

    b_pos := 0;
    for b in select * from jsonb_array_elements(s -> 'blocks') loop
      insert into blocks (session_id, position, kind, role, rounds, rest_sec)
      values (
        v_session, b_pos, (b ->> 'kind')::block_kind, (b ->> 'role')::block_role,
        (b ->> 'rounds')::smallint, (b ->> 'rest_sec')::smallint
      )
      returning id into v_block;
      b_pos := b_pos + 1;

      e_pos := 0;
      for e in select * from jsonb_array_elements(b -> 'exercises') loop
        v_exercise := (e ->> 'exercise_id')::uuid;

        if v_exercise is null then
          n := e -> 'new_exercise';
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
          returning id into v_exercise;

          insert into exercise_equipment (exercise_id, equipment_id)
          select v_exercise, q.id
          from equipment q
          where q.slug in (select jsonb_array_elements_text(n -> 'equipment_slugs'))
          on conflict do nothing;
        end if;

        insert into block_exercises (block_id, exercise_id, position, measure, per_side, technique_note)
        values (
          v_block, v_exercise, e_pos, (e ->> 'measure')::measure, (e ->> 'per_side')::boolean,
          nullif(e ->> 'technique_note', '')
        )
        returning id into v_be;
        e_pos := e_pos + 1;

        s_pos := 0;
        for st in select * from jsonb_array_elements(e -> 'sets') loop
          insert into sets (block_exercise_id, position, target_kg, target_reps, target_reps_max, target_seconds)
          values (
            v_be, s_pos, (st ->> 'kg')::numeric, (st ->> 'reps')::smallint,
            coalesce((st ->> 'max')::boolean, false), (st ->> 'seconds')::smallint
          );
          s_pos := s_pos + 1;
        end loop;
      end loop;
    end loop;
  end loop;

  return v_saved;
end;
$$;

revoke execute on function save_generated_week(date, text, text, jsonb) from public, anon;
grant execute on function save_generated_week(date, text, text, jsonb) to authenticated;
