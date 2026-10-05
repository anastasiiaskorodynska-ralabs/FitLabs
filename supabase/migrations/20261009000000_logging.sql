-- Log results: per-exercise notes, actual circuit rounds, one example per
-- logged session, and an atomic save.

alter table block_exercises add column notes text;
alter table blocks add column actual_rounds smallint check (actual_rounds >= 0);

-- "Save as example" keeps one example per session (editing results updates it).
create unique index examples_session_id_key on examples (session_id) where session_id is not null;

-- Saves what was actually done.
-- p_sets:   [{ "id", "completed", "kg", "reps", "seconds" }]
-- p_rounds: [{ "id", "rounds" }]  (circuit blocks)
-- p_notes:  [{ "id", "notes" }]   (block exercises)
-- p_example_text null = not saved as an example (removes an earlier one).
create function log_session(
  p_session_id uuid,
  p_status session_status,
  p_session_notes text,
  p_sets jsonb,
  p_rounds jsonb,
  p_notes jsonb,
  p_example_title text,
  p_example_text text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_day_type day_type;
begin
  if p_status = 'planned' then raise exception 'log as done or skipped'; end if;

  update sessions
  set status = p_status, notes = nullif(trim(p_session_notes), ''), logged_at = now()
  where id = p_session_id
  returning day_type into v_day_type;
  if v_day_type is null then raise exception 'session not found'; end if;

  -- Only rows that belong to this session are touched.
  update sets s set
    completed = (j ->> 'completed')::boolean,
    actual_kg = (j ->> 'kg')::numeric,
    actual_reps = (j ->> 'reps')::smallint,
    actual_seconds = (j ->> 'seconds')::smallint
  from jsonb_array_elements(p_sets) j, block_exercises be, blocks b
  where s.id = (j ->> 'id')::uuid
    and be.id = s.block_exercise_id
    and b.id = be.block_id
    and b.session_id = p_session_id;

  update blocks b set actual_rounds = (j ->> 'rounds')::smallint
  from jsonb_array_elements(p_rounds) j
  where b.id = (j ->> 'id')::uuid and b.session_id = p_session_id;

  update block_exercises be set notes = nullif(trim(j ->> 'notes'), '')
  from jsonb_array_elements(p_notes) j, blocks b
  where be.id = (j ->> 'id')::uuid and b.id = be.block_id and b.session_id = p_session_id;

  if p_status = 'done' and nullif(trim(p_example_text), '') is not null then
    insert into examples (day_type, title, raw_text, source, session_id)
    values (v_day_type, nullif(p_example_title, ''), trim(p_example_text), 'log', p_session_id)
    on conflict (session_id) where session_id is not null
    do update set raw_text = excluded.raw_text, title = excluded.title, day_type = excluded.day_type;
  else
    delete from examples where session_id = p_session_id and source = 'log';
  end if;
end;
$$;

revoke execute on function log_session(uuid, session_status, text, jsonb, jsonb, jsonb, text, text) from public, anon;
grant execute on function log_session(uuid, session_status, text, jsonb, jsonb, jsonb, text, text) to authenticated;
