-- Session editing: deferrable ordering constraints, atomic edit functions,
-- and the starter exercise library.

-- ---------------------------------------------------------------------------
-- Ordering constraints are checked at commit so functions can reorder rows.
-- ---------------------------------------------------------------------------

alter table blocks drop constraint blocks_session_id_position_key;
alter table blocks add constraint blocks_session_id_position_key
  unique (session_id, position) deferrable initially deferred;

alter table block_exercises drop constraint block_exercises_block_id_position_key;
alter table block_exercises add constraint block_exercises_block_id_position_key
  unique (block_id, position) deferrable initially deferred;

alter table sets drop constraint sets_block_exercise_id_position_key;
alter table sets add constraint sets_block_exercise_id_position_key
  unique (block_exercise_id, position) deferrable initially deferred;

comment on table sets is
  'One row per set. Circuit exercises have a single row: the target per round (blocks.rounds).';
comment on column blocks.rest_sec is
  'Rest in seconds: after each set (single), after the last exercise (superset), between rounds (circuit).';

-- ---------------------------------------------------------------------------
-- Functions (run as the caller, so RLS applies)
-- ---------------------------------------------------------------------------

-- Creates (or returns) the session on a date, creating its week if needed.
create function create_manual_session(p_date date, p_day_type day_type)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_week uuid;
  v_session uuid;
  v_start date := p_date - (extract(isodow from p_date)::int - 1);
begin
  insert into weeks (start_date) values (v_start) on conflict (start_date) do nothing;
  select id into v_week from weeks where start_date = v_start;

  select id into v_session from sessions where week_id = v_week and date = p_date;
  if v_session is null then
    insert into sessions (week_id, date, day_type) values (v_week, p_date, p_day_type)
    returning id into v_session;
  end if;
  return v_session;
end;
$$;

-- Adds an exercise to an existing block, or to a new block of p_kind/p_role.
-- New main blocks go before any finisher so the finisher stays last.
create function add_exercise(
  p_session_id uuid,
  p_exercise_id uuid,
  p_block_id uuid default null,
  p_kind block_kind default 'single',
  p_role block_role default 'main'
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_block blocks;
  v_ex exercises;
  v_pos smallint;
  v_sets int;
  v_be uuid;
begin
  select * into v_ex from exercises where id = p_exercise_id;
  if v_ex.id is null then raise exception 'exercise not found'; end if;

  if p_block_id is null then
    if p_role = 'finisher' then
      select coalesce(max(position) + 1, 0) into v_pos from blocks where session_id = p_session_id;
    else
      select coalesce(max(position) + 1, 0) into v_pos
      from blocks where session_id = p_session_id and role <> 'finisher';
      update blocks set position = position + 1
      where session_id = p_session_id and position >= v_pos;
    end if;

    insert into blocks (session_id, position, kind, role, rounds, rest_sec)
    values (
      p_session_id, v_pos, p_kind, p_role,
      case when p_kind = 'circuit' then (case when p_role = 'finisher' then 2 else 3 end) end,
      case when p_role = 'finisher' then 30 when p_kind = 'circuit' then 60 else 90 end
    )
    returning * into v_block;
  else
    select * into v_block from blocks where id = p_block_id and session_id = p_session_id;
    if v_block.id is null then raise exception 'block not found'; end if;
  end if;

  select coalesce(max(position) + 1, 0) into v_pos from block_exercises where block_id = v_block.id;
  insert into block_exercises (block_id, exercise_id, position, measure, per_side)
  values (v_block.id, v_ex.id, v_pos, v_ex.default_measure, v_ex.per_side)
  returning id into v_be;

  -- Circuits keep one target per round; others match their block-mates (default 3).
  if v_block.kind = 'circuit' then
    v_sets := 1;
  else
    select coalesce(max(n), 3) into v_sets from (
      select count(*) as n from sets s
      join block_exercises be on be.id = s.block_exercise_id
      where be.block_id = v_block.id and be.id <> v_be
      group by be.id
    ) t;
  end if;

  insert into sets (block_exercise_id, position, target_kg, target_reps, target_seconds)
  select v_be, g - 1,
    case when v_ex.is_bodyweight then null else 10 end,
    case when v_ex.default_measure = 'reps' then 10 end,
    case when v_ex.default_measure = 'seconds' then 30 end
  from generate_series(1, v_sets) g;

  return v_be;
end;
$$;

-- Moves an exercise up (-1) or down (1). Exercises alone in their block move
-- the whole block, without crossing between main and finisher blocks.
create function move_block_exercise(p_id uuid, p_dir int)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_be block_exercises;
  v_block blocks;
  v_other_be block_exercises;
  v_other_block blocks;
  v_count int;
begin
  select * into v_be from block_exercises where id = p_id;
  select * into v_block from blocks where id = v_be.block_id;
  select count(*) into v_count from block_exercises where block_id = v_block.id;

  if v_count > 1 then
    select * into v_other_be from block_exercises
    where block_id = v_block.id
      and case when p_dir < 0 then position < v_be.position else position > v_be.position end
    order by case when p_dir < 0 then -position else position end
    limit 1;
    if v_other_be.id is null then return; end if;
    update block_exercises set position = v_other_be.position where id = v_be.id;
    update block_exercises set position = v_be.position where id = v_other_be.id;
  else
    select * into v_other_block from blocks
    where session_id = v_block.session_id
      and role = v_block.role
      and case when p_dir < 0 then position < v_block.position else position > v_block.position end
    order by case when p_dir < 0 then -position else position end
    limit 1;
    if v_other_block.id is null then return; end if;
    update blocks set position = v_other_block.position where id = v_block.id;
    update blocks set position = v_block.position where id = v_other_block.id;
  end if;
end;
$$;

-- Deletes an exercise and its block when that was the last exercise.
create function delete_block_exercise(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_block uuid;
begin
  delete from block_exercises where id = p_id returning block_id into v_block;
  delete from blocks b
  where b.id = v_block and not exists (select 1 from block_exercises where block_id = v_block);
end;
$$;

-- Replaces the exercise, keeping sets. Converts targets if reps/seconds differ.
create function swap_exercise(p_id uuid, p_exercise_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ex exercises;
  v_old measure;
begin
  select * into v_ex from exercises where id = p_exercise_id;
  if v_ex.id is null then raise exception 'exercise not found'; end if;
  select measure into v_old from block_exercises where id = p_id;

  update block_exercises
  set exercise_id = v_ex.id, measure = v_ex.default_measure, per_side = v_ex.per_side
  where id = p_id;

  if v_old <> v_ex.default_measure then
    update sets set
      target_reps = case when v_ex.default_measure = 'reps' then 10 end,
      target_reps_max = false,
      target_seconds = case when v_ex.default_measure = 'seconds' then 30 end
    where block_exercise_id = p_id;
  end if;

  if v_ex.is_bodyweight then
    update sets set target_kg = null where block_exercise_id = p_id;
  end if;
end;
$$;

-- Saves an exercise's mode and all its set targets in one go.
-- p_sets: [{ "id": uuid, "kg": number|null, "reps": int|null, "max": bool, "seconds": int|null }]
create function save_exercise_sets(p_id uuid, p_measure measure, p_per_side boolean, p_sets jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update block_exercises set measure = p_measure, per_side = p_per_side where id = p_id;

  update sets s set
    target_kg = (j ->> 'kg')::numeric,
    target_reps = (j ->> 'reps')::smallint,
    target_reps_max = coalesce((j ->> 'max')::boolean, false),
    target_seconds = (j ->> 'seconds')::smallint
  from jsonb_array_elements(p_sets) j
  where s.id = (j ->> 'id')::uuid and s.block_exercise_id = p_id;
end;
$$;

-- Appends a copy of the last set.
create function add_set(p_block_exercise_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into sets (block_exercise_id, position, target_kg, target_reps, target_reps_max, target_seconds)
  select block_exercise_id, position + 1, target_kg, target_reps, target_reps_max, target_seconds
  from sets
  where block_exercise_id = p_block_exercise_id
  order by position desc
  limit 1;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'create_manual_session(date, day_type)',
    'add_exercise(uuid, uuid, uuid, block_kind, block_role)',
    'move_block_exercise(uuid, int)',
    'delete_block_exercise(uuid)',
    'swap_exercise(uuid, uuid)',
    'save_exercise_sets(uuid, measure, boolean, jsonb)',
    'add_set(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Starter exercise library. Technique steps are separated by newlines.
-- Muscle keys are translated in messages/*.json (Muscles).
-- ---------------------------------------------------------------------------

insert into exercises
  (slug, name_en, name_uk, muscle_groups, day_types, default_measure, per_side, is_bodyweight, is_abs, is_warmup, technique_en, technique_uk)
values
-- Lower body
('barbell-back-squat', 'Barbell back squat', 'Присідання зі штангою', '{quads,glutes,core}', '{lower,full}', 'reps', false, false, false, false,
 'Bar on your upper back, feet shoulder-width, toes slightly out.
Brace your core and sit down between your heels until thighs are at least parallel.
Drive up through the whole foot, keeping your chest up.',
 'Штанга на верху спини, стопи на ширині плечей, носки трохи назовні.
Напружте кор і сідайте між пʼятами, доки стегна не будуть хоча б паралельні підлозі.
Вставайте, тиснучи всією стопою, груди тримайте піднятими.'),
('goblet-squat', 'Goblet squat', 'Гоблет-присідання', '{quads,glutes}', '{lower,full,func}', 'reps', false, false, false, false,
 'Hold a dumbbell vertically at your chest, elbows tucked.
Sit down between your knees, keeping your torso tall.
Stand up by pushing the floor away, knees tracking over toes.',
 'Тримайте гантель вертикально біля грудей, лікті притиснуті.
Сідайте між колінами, корпус тримайте рівно.
Вставайте, відштовхуючи підлогу, коліна над носками.'),
('dumbbell-romanian-deadlift', 'Dumbbell Romanian deadlift', 'Румунська тяга з гантелями', '{hamstrings,glutes}', '{lower,full}', 'reps', false, false, false, false,
 'Stand tall, dumbbells in front of your thighs, soft knees.
Push your hips back and slide the weights down your legs with a flat back.
Stop when you feel a hamstring stretch, then squeeze glutes to stand.',
 'Станьте рівно, гантелі перед стегнами, коліна злегка зігнуті.
Відводьте таз назад і опускайте гантелі вздовж ніг із рівною спиною.
Зупиніться, коли відчуєте розтяг задньої поверхні стегна, і встаньте, стискаючи сідниці.'),
('barbell-romanian-deadlift', 'Barbell Romanian deadlift', 'Румунська тяга зі штангою', '{hamstrings,glutes,back}', '{lower,full}', 'reps', false, false, false, false,
 'Hold the bar at hip height with a shoulder-width grip.
Hinge at the hips, bar close to your legs, back flat.
Lower to mid-shin or until hamstrings stretch, then drive hips forward.',
 'Тримайте штангу на рівні таза хватом на ширині плечей.
Нахиляйтеся в тазостегновому суглобі, штанга близько до ніг, спина рівна.
Опустіть до середини гомілки або до розтягу, потім виведіть таз уперед.'),
('leg-press', 'Leg press', 'Жим ногами', '{quads,glutes}', '{lower}', 'reps', false, false, false, false,
 'Sit with your lower back flat on the pad, feet hip-width on the platform.
Release the safeties and lower until knees reach about 90°.
Press through your whole foot to straighten — don''t lock the knees.',
 'Сядьте, притиснувши поперек до спинки, стопи на ширині таза на платформі.
Зніміть фіксатори й опускайте, доки коліна не зігнуться приблизно на 90°.
Вижимайте всією стопою, не замикаючи коліна.'),
('bulgarian-split-squat', 'Bulgarian split squat', 'Болгарські присідання', '{quads,glutes}', '{lower}', 'reps', true, false, false, false,
 'Rear foot laces-down on a bench, front foot a long stride ahead, dumbbells at your sides.
Lower straight down until the back knee nearly touches the floor.
Drive through the front heel to stand. Finish one side, then switch.',
 'Задня стопа підйомом на лаві, передня — на широкий крок уперед, гантелі в руках.
Опускайтеся вертикально, доки заднє коліно майже не торкнеться підлоги.
Вставайте, тиснучи передньою пʼятою. Завершіть одну сторону, потім іншу.'),
('bodyweight-bulgarian-split-squat', 'Bulgarian split squat (bodyweight)', 'Болгарські присідання без ваги', '{quads,glutes}', '{lower,func}', 'reps', true, true, false, false,
 'Same setup as the weighted version, hands on hips.
Keep the tempo controlled — 2 s down, 1 s up.
Keep your torso tall and the front knee tracking over toes.',
 'Та сама позиція, що й з вагою, руки на поясі.
Контрольований темп — 2 с униз, 1 с угору.
Корпус рівний, переднє коліно над носком.'),
('dumbbell-walking-lunge', 'Dumbbell walking lunge', 'Випади з гантелями в русі', '{quads,glutes}', '{lower,func}', 'reps', true, false, false, false,
 'Dumbbells at your sides, step forward into a long stride.
Lower until both knees are at about 90°.
Push off the front foot and step straight into the next lunge.',
 'Гантелі в опущених руках, зробіть широкий крок уперед.
Опускайтеся, доки обидва коліна не зігнуться приблизно на 90°.
Відштовхніться передньою ногою й одразу переходьте в наступний випад.'),
('walking-lunge', 'Walking lunge', 'Випади в русі', '{quads,glutes}', '{lower,func,full}', 'reps', true, true, false, false,
 'Step forward and lower until both knees are at about 90°.
Push off the front foot and step straight into the next lunge.
Count each leg.',
 'Крок уперед і опускання, доки обидва коліна не зігнуться приблизно на 90°.
Відштовхніться передньою ногою й переходьте в наступний випад.
Рахуйте кожну ногу.'),
('dumbbell-reverse-lunge', 'Dumbbell reverse lunge', 'Зворотні випади з гантелями', '{glutes,quads}', '{lower}', 'reps', true, false, false, false,
 'Stand tall with dumbbells at your sides.
Step one foot back and lower the back knee towards the floor.
Push through the front heel to return. Alternate or finish one side.',
 'Станьте рівно з гантелями в руках.
Зробіть крок назад і опустіть заднє коліно до підлоги.
Поверніться, тиснучи передньою пʼятою. Чергуйте ноги або завершіть одну сторону.'),
('dumbbell-step-up', 'Dumbbell step-up', 'Зашагування на тумбу з гантелями', '{quads,glutes}', '{lower,func}', 'reps', true, false, false, false,
 'Whole foot on the box, dumbbells at your sides.
Drive through the top foot to stand on the box without pushing off the back leg.
Lower slowly with control.',
 'Уся стопа на тумбі, гантелі в руках.
Встаньте на тумбу, тиснучи верхньою ногою, не відштовхуючись задньою.
Повільно опускайтеся з контролем.'),
('barbell-hip-thrust', 'Barbell hip thrust', 'Ягідний міст зі штангою', '{glutes,hamstrings}', '{lower}', 'reps', false, false, false, false,
 'Upper back on a bench, bar padded across your hips, feet flat.
Drive your hips up until your body is straight from knees to shoulders.
Squeeze glutes at the top, chin tucked, then lower with control.',
 'Верх спини на лаві, штанга з подушкою на тазі, стопи на підлозі.
Піднімайте таз, доки тіло не стане прямим від колін до плечей.
Стисніть сідниці вгорі, підборіддя притиснуте, опускайтеся з контролем.'),
('glute-bridge', 'Glute bridge', 'Ягідний місток', '{glutes,hamstrings}', '{lower,func}', 'reps', false, true, false, true,
 'Lie on your back, knees bent, feet flat near your hips.
Press through your heels and lift your hips until they line up with knees and shoulders.
Pause and squeeze, then lower slowly.',
 'Ляжте на спину, коліна зігнуті, стопи біля таза.
Тисніть пʼятами й піднімайте таз до однієї лінії з колінами й плечима.
Затримайтеся, стисніть сідниці й повільно опустіться.'),
('lying-leg-curl', 'Leg curl', 'Згинання ніг у тренажері', '{hamstrings}', '{lower}', 'reps', false, false, false, false,
 'Set the pad just above your heels, knees in line with the machine axis.
Curl the pad towards your glutes without lifting your hips.
Lower slowly over 2–3 seconds.',
 'Валик трохи вище пʼят, коліна на одній осі з тренажером.
Згинайте ноги до сідниць, не відриваючи таз.
Повільно опускайте за 2–3 секунди.'),
('leg-extension', 'Leg extension', 'Розгинання ніг у тренажері', '{quads}', '{lower}', 'reps', false, false, false, false,
 'Sit back, pad on your lower shins, knees in line with the axis.
Straighten your legs and squeeze the quads at the top.
Lower with control — don''t let the stack slam.',
 'Сядьте глибоко, валик на нижній частині гомілок, коліна на осі тренажера.
Розгинайте ноги й напружте квадрицепси вгорі.
Опускайте з контролем, не кидаючи вагу.'),
('smith-machine-squat', 'Smith machine squat', 'Присідання в тренажері Сміта', '{quads,glutes}', '{lower}', 'reps', false, false, false, false,
 'Bar on your upper back, feet slightly in front of the bar.
Unhook and sit down until thighs are parallel.
Press up through your heels and re-hook at the end.',
 'Гриф на верху спини, стопи трохи попереду грифа.
Зніміть з упорів і сідайте до паралелі стегон із підлогою.
Вставайте, тиснучи пʼятами, і поверніть гриф на упори.'),
('dumbbell-calf-raise', 'Dumbbell calf raise', 'Підйоми на носки з гантелями', '{calves}', '{lower}', 'reps', false, false, false, false,
 'Stand with the balls of your feet on a step, dumbbells in hand.
Rise as high as you can onto your toes.
Pause, then lower your heels below the step for a stretch.',
 'Станьте передньою частиною стоп на сходинку, гантелі в руках.
Підніміться на носки якомога вище.
Затримайтеся й опустіть пʼяти нижче сходинки для розтягу.'),
('cable-pull-through', 'Cable pull-through', 'Протяжка троса між ногами', '{glutes,hamstrings}', '{lower,func}', 'reps', false, false, false, false,
 'Face away from a low cable, rope between your legs.
Hinge back, letting the rope pull your hands through your legs.
Snap your hips forward to stand tall and squeeze glutes.',
 'Станьте спиною до нижнього блока, канат між ногами.
Нахиліться, відводячи таз, — канат тягне руки між ногами.
Різко виведіть таз уперед, випряміться й стисніть сідниці.'),
('wall-sit', 'Wall sit', 'Стільчик біля стіни', '{quads}', '{lower,func}', 'seconds', false, true, false, false,
 'Back flat against the wall, slide down until thighs are parallel.
Knees over ankles, weight in your heels.
Breathe steadily and hold for the full time.',
 'Спина рівно на стіні, опустіться до паралелі стегон із підлогою.
Коліна над щиколотками, вага на пʼятах.
Рівно дихайте й утримуйте весь час.'),
('box-jump', 'Box jump', 'Стрибки на тумбу', '{quads,glutes,calves}', '{func,lower}', 'reps', false, true, false, false,
 'Stand a short step from the box, feet hip-width.
Swing your arms and jump, landing softly with the whole foot on the box.
Stand tall, then step down — don''t jump down.',
 'Станьте на невеликій відстані від тумби, стопи на ширині таза.
Змахніть руками й стрибніть, мʼяко приземляючись усією стопою.
Випряміться й зійдіть униз кроком — не зістрибуйте.'),
-- Upper body
('barbell-bench-press', 'Barbell bench press', 'Жим штанги лежачи', '{chest,triceps,shoulders}', '{upper,full}', 'reps', false, false, false, false,
 'Eyes under the bar, shoulder blades pulled back, feet planted.
Lower the bar to your mid-chest with elbows at about 45°.
Press up and slightly back over your shoulders.',
 'Очі під грифом, лопатки зведені, стопи впираються в підлогу.
Опускайте штангу до середини грудей, лікті приблизно під 45°.
Вижимайте вгору й трохи назад, до лінії плечей.'),
('dumbbell-bench-press', 'Dumbbell bench press', 'Жим гантелей лежачи', '{chest,triceps,shoulders}', '{upper,full}', 'reps', false, false, false, false,
 'Lie on the bench with dumbbells over your chest, shoulder blades squeezed.
Lower the dumbbells to chest level, elbows at about 45°.
Press up until arms are straight, without clanking the weights.',
 'Ляжте на лаву, гантелі над грудьми, лопатки зведені.
Опускайте гантелі до рівня грудей, лікті приблизно під 45°.
Вижимайте до прямих рук, не стукаючи гантелями.'),
('incline-dumbbell-press', 'Incline dumbbell press', 'Жим гантелей на похилій лаві', '{chest,shoulders,triceps}', '{upper}', 'reps', false, false, false, false,
 'Set the bench to about 30°, dumbbells at shoulder height.
Press up and slightly in until arms are straight.
Lower slowly to the top of your chest.',
 'Нахил лави близько 30°, гантелі на рівні плечей.
Вижимайте вгору й трохи всередину до прямих рук.
Повільно опускайте до верху грудей.'),
('push-up', 'Push-up', 'Віджимання', '{chest,triceps,core}', '{upper,func,full}', 'reps', false, true, false, false,
 'Hands just wider than shoulders, body in one straight line.
Lower your chest to just above the floor, elbows at about 45°.
Push the floor away to straight arms.',
 'Руки трохи ширше плечей, тіло — одна пряма лінія.
Опустіть груди майже до підлоги, лікті приблизно під 45°.
Відштовхніть підлогу до прямих рук.'),
('dumbbell-overhead-press', 'Dumbbell overhead press', 'Жим гантелей над головою', '{shoulders,triceps}', '{upper}', 'reps', false, false, false, false,
 'Stand or sit tall, dumbbells at shoulder height, palms forward.
Press overhead until arms are straight, ribs down.
Lower back to shoulder height with control.',
 'Станьте або сядьте рівно, гантелі на рівні плечей, долоні вперед.
Вижимайте над головою до прямих рук, ребра опущені.
Опускайте до плечей з контролем.'),
('barbell-overhead-press', 'Barbell overhead press', 'Жим штанги стоячи', '{shoulders,triceps,core}', '{upper,full}', 'reps', false, false, false, false,
 'Bar on your front shoulders, grip just outside shoulders.
Brace, then press the bar straight up, moving your head back out of the way.
Lock out overhead, then lower to your shoulders.',
 'Штанга на передніх дельтах, хват трохи ширше плечей.
Напружте кор і вижміть штангу вгору, відводячи голову назад.
Зафіксуйте над головою й опустіть на плечі.'),
('arnold-press', 'Arnold press', 'Жим Арнольда', '{shoulders,triceps}', '{upper}', 'reps', false, false, false, false,
 'Sit tall, dumbbells in front of your shoulders, palms facing you.
Press up while rotating your palms to face forward.
Reverse the rotation on the way down.',
 'Сядьте рівно, гантелі перед плечима, долоні до себе.
Вижимайте вгору, розвертаючи долоні вперед.
На шляху вниз розвертайте у зворотному напрямку.'),
('lateral-raise', 'Lateral raise', 'Розведення гантелей у сторони', '{shoulders}', '{upper}', 'reps', false, false, false, false,
 'Stand tall, light dumbbells at your sides, slight bend in the elbows.
Raise your arms out to shoulder height, leading with the elbows.
Lower slowly — no swinging.',
 'Станьте рівно, легкі гантелі вздовж тіла, лікті злегка зігнуті.
Піднімайте руки в сторони до рівня плечей, ведучи ліктями.
Повільно опускайте, без розгойдування.'),
('lat-pulldown', 'Lat pulldown', 'Верхня тяга', '{lats,biceps}', '{upper}', 'reps', false, false, false, false,
 'Grip the bar just wider than shoulders, thighs under the pads.
Pull the bar to your upper chest, driving elbows down and back.
Let the bar rise slowly until arms are straight.',
 'Хват трохи ширше плечей, стегна під валиками.
Тягніть гриф до верху грудей, ведучи лікті вниз і назад.
Повільно відпускайте до прямих рук.'),
('pull-up', 'Pull-up', 'Підтягування', '{lats,biceps,core}', '{upper,full}', 'reps', false, true, false, false,
 'Hang from the bar, hands just wider than shoulders, shoulders pulled down.
Pull until your chin clears the bar, without swinging.
Lower all the way to straight arms.',
 'Повисніть на турніку, хват трохи ширше плечей, плечі опущені.
Підтягніться, доки підборіддя не буде над перекладиною, без розгойдування.
Опускайтеся до повністю прямих рук.'),
('seated-cable-row', 'Seated cable row', 'Горизонтальна тяга блока', '{back,lats,biceps}', '{upper}', 'reps', false, false, false, false,
 'Sit tall, feet on the platform, slight bend in the knees.
Pull the handle to your belly, squeezing shoulder blades together.
Return slowly until arms are straight, without rounding your back.',
 'Сядьте рівно, стопи на платформі, коліна злегка зігнуті.
Тягніть рукоятку до живота, зводячи лопатки.
Повільно поверніться до прямих рук, не округлюючи спину.'),
('one-arm-dumbbell-row', 'One-arm dumbbell row', 'Тяга гантелі однією рукою', '{back,lats,biceps}', '{upper}', 'reps', true, false, false, false,
 'One knee and hand on the bench, back flat, dumbbell hanging below your shoulder.
Row the dumbbell to your hip, elbow close to your body.
Lower until your arm is straight. Finish one side, then switch.',
 'Коліно й рука на лаві, спина рівна, гантель під плечем.
Тягніть гантель до стегна, лікоть близько до тіла.
Опускайте до прямої руки. Завершіть одну сторону, потім іншу.'),
('barbell-bent-over-row', 'Barbell bent-over row', 'Тяга штанги в нахилі', '{back,lats,biceps}', '{upper,full}', 'reps', false, false, false, false,
 'Hinge forward to about 45°, back flat, bar hanging at arm''s length.
Row the bar to your lower ribs, elbows back.
Lower with control, keeping your torso still.',
 'Нахиліться приблизно на 45°, спина рівна, штанга на прямих руках.
Тягніть штангу до нижніх ребер, лікті назад.
Опускайте з контролем, корпус нерухомий.'),
('face-pull', 'Face pull', 'Тяга канату до обличчя', '{shoulders,back}', '{upper}', 'reps', false, false, false, true,
 'Set a rope at upper-chest height, palms facing in.
Pull towards your face, hands ending beside your ears, elbows high.
Pause, then return slowly.',
 'Канат на рівні верху грудей, долоні одна до одної.
Тягніть до обличчя, кисті біля вух, лікті високо.
Затримайтеся й повільно поверніться.'),
('cable-fly', 'Cable fly', 'Зведення рук у кросовері', '{chest}', '{upper}', 'reps', false, false, false, false,
 'Handles at shoulder height, step forward, slight bend in the elbows.
Bring your hands together in front of your chest in a wide arc.
Open back slowly until you feel a chest stretch.',
 'Рукоятки на рівні плечей, крок уперед, лікті злегка зігнуті.
Зводьте руки перед грудьми широкою дугою.
Повільно розводьте до відчуття розтягу грудних.'),
('triceps-pushdown', 'Triceps pushdown', 'Розгинання рук на блоці', '{triceps}', '{upper}', 'reps', false, false, false, false,
 'Stand tall at a high cable, elbows pinned to your sides.
Push the handle down until your arms are straight.
Let it rise until forearms are just above parallel.',
 'Станьте рівно біля верхнього блока, лікті притиснуті до боків.
Розгинайте руки вниз до повного випрямлення.
Повертайте, доки передпліччя не будуть трохи вище паралелі.'),
('ez-bar-curl', 'EZ-bar curl', 'Згинання рук з EZ-грифом', '{biceps}', '{upper}', 'reps', false, false, false, false,
 'Stand tall, EZ bar at your thighs, elbows by your sides.
Curl the bar up without swinging your body.
Lower slowly to straight arms.',
 'Станьте рівно, EZ-гриф біля стегон, лікті біля боків.
Згинайте руки, не розгойдуючи корпус.
Повільно опускайте до прямих рук.'),
('dumbbell-curl', 'Dumbbell curl', 'Згинання рук з гантелями', '{biceps}', '{upper}', 'reps', false, false, false, false,
 'Stand tall, dumbbells at your sides, palms forward.
Curl the weights up, keeping elbows still.
Lower slowly to straight arms.',
 'Станьте рівно, гантелі вздовж тіла, долоні вперед.
Згинайте руки, лікті нерухомі.
Повільно опускайте до прямих рук.'),
('hammer-curl', 'Hammer curl', 'Молоткові згинання', '{biceps,forearms}', '{upper}', 'reps', false, false, false, false,
 'Hold dumbbells with palms facing each other.
Curl up, keeping your wrists neutral and elbows by your sides.
Lower with control.',
 'Тримайте гантелі долонями одна до одної.
Згинайте руки, зберігаючи нейтральне положення зап’ястків, лікті біля боків.
Опускайте з контролем.'),
('ez-bar-skull-crusher', 'EZ-bar skull crusher', 'Французький жим з EZ-грифом', '{triceps}', '{upper}', 'reps', false, false, false, false,
 'Lie on a bench, EZ bar above your chest with straight arms.
Bend only at the elbows to lower the bar towards your forehead.
Straighten your arms back up.',
 'Ляжте на лаву, EZ-гриф над грудьми на прямих руках.
Згинайте лише лікті, опускаючи гриф до чола.
Розгинайте руки назад угору.'),
('band-pull-apart', 'Band pull-apart', 'Розведення стрічки', '{shoulders,back}', '{upper}', 'reps', false, false, false, true,
 'Hold a band at shoulder height with straight arms.
Pull the band apart until it touches your chest, squeezing shoulder blades.
Return slowly.',
 'Тримайте стрічку на рівні плечей прямими руками.
Розтягуйте стрічку до грудей, зводячи лопатки.
Повільно поверніться.'),
-- Functional and full body
('kettlebell-swing', 'Kettlebell swing', 'Махи гирею', '{glutes,hamstrings,core}', '{func,full,lower}', 'reps', false, false, false, false,
 'Hinge at the hips, bell between your feet, flat back.
Hike the bell back, then snap your hips forward to float it to chest height.
Let it fall back into the hinge — arms stay relaxed.',
 'Нахил у тазостегновому суглобі, гиря між стопами, спина рівна.
Закиньте гирю назад, потім різко виведіть таз уперед — гиря злітає до грудей.
Дайте їй повернутися в нахил — руки розслаблені.'),
('burpee', 'Burpee', 'Берпі', '{full_body}', '{func,full}', 'reps', false, true, false, false,
 'From standing, squat and place your hands on the floor.
Jump your feet back to a plank, then jump them back in.
Stand and jump, reaching overhead.',
 'Зі стійки присядьте й поставте руки на підлогу.
Стрибком перейдіть у планку, потім поверніть ноги назад.
Встаньте й підстрибніть, тягнучись руками вгору.'),
('mountain-climber', 'Mountain climber', 'Альпініст', '{core,shoulders}', '{func,full}', 'seconds', false, true, true, false,
 'Start in a high plank, hands under shoulders.
Drive one knee towards your chest, then switch quickly.
Keep your hips level and your back flat.',
 'Почніть у планці на прямих руках, руки під плечима.
Підтягніть одне коліно до грудей і швидко змініть ногу.
Таз рівно, спина пряма.'),
('jump-squat', 'Jump squat', 'Присідання з вистрибуванням', '{quads,glutes,calves}', '{func}', 'reps', false, true, false, false,
 'Feet shoulder-width, squat to about parallel.
Explode up into a jump.
Land softly and go straight into the next squat.',
 'Стопи на ширині плечей, присядьте приблизно до паралелі.
Вибухово вистрибніть угору.
Мʼяко приземліться й одразу переходьте в наступне присідання.'),
('farmers-carry', 'Farmer''s carry', 'Прогулянка фермера', '{forearms,traps,core}', '{func,full}', 'seconds', false, false, false, false,
 'Pick up heavy dumbbells at your sides.
Walk with short, quick steps, shoulders back and core braced.
Keep going for the full time without letting the weights swing.',
 'Візьміть важкі гантелі в опущені руки.
Йдіть короткими швидкими кроками, плечі розправлені, кор напружений.
Тримайте весь час, не розгойдуючи гантелі.'),
('dumbbell-thruster', 'Dumbbell thruster', 'Трастер з гантелями', '{quads,glutes,shoulders}', '{func,full}', 'reps', false, false, false, false,
 'Dumbbells at your shoulders, feet shoulder-width.
Squat down, then drive up and press the dumbbells overhead in one movement.
Lower the weights to your shoulders as you go into the next squat.',
 'Гантелі на плечах, стопи на ширині плечей.
Присядьте, потім одним рухом встаньте й вижміть гантелі над головою.
Опускайте гантелі на плечі, переходячи в наступне присідання.'),
-- Abs and core
('plank', 'Plank', 'Планка', '{abs,shoulders}', '{lower,upper,func,full}', 'seconds', false, true, true, false,
 'Forearms under shoulders, body in one straight line.
Squeeze glutes and brace as if about to be poked.
Hold — don''t let your hips sag.',
 'Передпліччя під плечима, тіло — одна пряма лінія.
Стисніть сідниці й напружте прес.
Утримуйте, не прогинаючи поперек.'),
('side-plank', 'Side plank', 'Бічна планка', '{obliques,core}', '{lower,upper,func,full}', 'seconds', true, true, true, false,
 'Lie on your side, elbow under your shoulder, feet stacked.
Lift your hips so your body forms a straight line.
Hold, then switch sides.',
 'Ляжте на бік, лікоть під плечем, стопи одна на одній.
Підніміть таз, щоб тіло утворило пряму лінію.
Утримуйте, потім змініть сторону.'),
('dead-bug', 'Dead bug', 'Мертвий жук', '{abs}', '{lower,upper,func,full}', 'reps', true, true, true, false,
 'Lie on your back, arms up, knees over hips.
Press your lower back into the floor.
Extend the opposite arm and leg, return, switch.',
 'Ляжте на спину, руки вгору, коліна над тазом.
Притисніть поперек до підлоги.
Випряміть протилежні руку й ногу, поверніться, змініть сторону.'),
('hanging-knee-raise', 'Hanging knee raise', 'Підйоми колін у висі', '{abs,hip_flexors}', '{lower,upper,func,full}', 'reps', false, true, true, false,
 'Hang with straight arms, shoulders pulled down.
Curl your knees towards your chest without swinging.
Lower slowly. Stop when form breaks.',
 'Повисніть на прямих руках, плечі опущені.
Підтягуйте коліна до грудей без розгойдування.
Повільно опускайте. Зупиніться, коли техніка ламається.'),
('reverse-crunch', 'Reverse crunch', 'Зворотні скручування', '{abs}', '{lower,upper,func,full}', 'reps', false, true, true, false,
 'Lie on your back, knees bent at 90°, hands by your sides.
Curl your hips off the floor, bringing knees towards your chest.
Lower slowly without letting your feet touch down.',
 'Ляжте на спину, коліна зігнуті під 90°, руки вздовж тіла.
Підкручуйте таз від підлоги, підтягуючи коліна до грудей.
Повільно опускайте, не торкаючись стопами підлоги.'),
('bicycle-crunch', 'Bicycle crunch', 'Велосипед', '{abs,obliques}', '{lower,upper,func,full}', 'reps', true, true, true, false,
 'Lie on your back, hands lightly behind your head, legs raised.
Bring one elbow towards the opposite knee while extending the other leg.
Switch sides in a slow, controlled rhythm.',
 'Ляжте на спину, руки легко за головою, ноги підняті.
Тягніть лікоть до протилежного коліна, випрямляючи іншу ногу.
Змінюйте сторони в повільному контрольованому ритмі.'),
('cable-crunch', 'Cable crunch', 'Скручування на блоці', '{abs}', '{lower,upper,full}', 'reps', false, false, true, false,
 'Kneel facing a high cable, rope beside your head.
Crunch down by curling your ribs towards your hips.
Return slowly, keeping your hips still.',
 'Станьте на коліна обличчям до верхнього блока, канат біля голови.
Скручуйтеся, наближаючи ребра до таза.
Повільно поверніться, таз нерухомий.'),
('russian-twist', 'Russian twist', 'Російські скручування', '{obliques,abs}', '{lower,upper,func,full}', 'reps', true, true, true, false,
 'Sit with knees bent, lean back slightly with a straight back.
Rotate your torso to tap the floor beside one hip, then the other.
Lift your feet to make it harder.',
 'Сядьте, коліна зігнуті, трохи відхиліться з рівною спиною.
Розвертайте корпус і торкайтеся підлоги біля одного стегна, потім іншого.
Підніміть стопи, щоб ускладнити.'),
('bird-dog', 'Bird dog', 'Пташка-собака', '{core,glutes}', '{lower,upper,func,full}', 'reps', true, true, true, true,
 'On hands and knees, back flat.
Extend the opposite arm and leg until level with your body.
Pause, return, switch sides.',
 'Станьте рачки, спина рівна.
Витягніть протилежні руку й ногу до рівня тіла.
Затримайтеся, поверніться, змініть сторону.'),
-- Warm-up
('jumping-jacks', 'Jumping jacks', 'Стрибки «зірочка»', '{full_body}', '{lower,upper,func,full}', 'seconds', false, true, false, true,
 'Stand with feet together, arms by your sides.
Jump your feet out while raising your arms overhead.
Jump back and repeat at a steady pace.',
 'Станьте, стопи разом, руки вздовж тіла.
Стрибком розставте ноги, піднімаючи руки над головою.
Поверніться стрибком і повторюйте в рівному темпі.'),
('worlds-greatest-stretch', 'World''s greatest stretch', 'Найкраща розтяжка', '{hip_flexors,hamstrings,back}', '{lower,upper,func,full}', 'reps', true, true, false, true,
 'Step into a deep lunge, both hands on the floor inside your front foot.
Rotate your inside arm up towards the ceiling, then bring it back down.
Straighten the front leg for a hamstring stretch, then switch sides.',
 'Зробіть глибокий випад, обидві руки на підлозі з внутрішнього боку передньої стопи.
Розверніть внутрішню руку вгору до стелі й поверніть униз.
Випряміть передню ногу для розтягу задньої поверхні стегна, потім змініть сторону.')
on conflict (slug) do nothing;

insert into exercise_equipment (exercise_id, equipment_id)
select e.id, q.id
from (values
  ('barbell-back-squat', 'barbell'),
  ('goblet-squat', 'dumbbells'),
  ('dumbbell-romanian-deadlift', 'dumbbells'),
  ('barbell-romanian-deadlift', 'barbell'),
  ('leg-press', 'leg-press'),
  ('bulgarian-split-squat', 'dumbbells'),
  ('bulgarian-split-squat', 'bench'),
  ('bodyweight-bulgarian-split-squat', 'bench'),
  ('dumbbell-walking-lunge', 'dumbbells'),
  ('dumbbell-reverse-lunge', 'dumbbells'),
  ('dumbbell-step-up', 'dumbbells'),
  ('dumbbell-step-up', 'plyo-box'),
  ('barbell-hip-thrust', 'barbell'),
  ('barbell-hip-thrust', 'bench'),
  ('lying-leg-curl', 'leg-curl-extension'),
  ('leg-extension', 'leg-curl-extension'),
  ('smith-machine-squat', 'smith-machine'),
  ('dumbbell-calf-raise', 'dumbbells'),
  ('cable-pull-through', 'cable-station'),
  ('box-jump', 'plyo-box'),
  ('barbell-bench-press', 'barbell'),
  ('barbell-bench-press', 'bench'),
  ('dumbbell-bench-press', 'dumbbells'),
  ('dumbbell-bench-press', 'bench'),
  ('incline-dumbbell-press', 'dumbbells'),
  ('incline-dumbbell-press', 'bench'),
  ('dumbbell-overhead-press', 'dumbbells'),
  ('barbell-overhead-press', 'barbell'),
  ('arnold-press', 'dumbbells'),
  ('lateral-raise', 'dumbbells'),
  ('lat-pulldown', 'lat-pulldown'),
  ('pull-up', 'pull-up-bar'),
  ('seated-cable-row', 'cable-station'),
  ('one-arm-dumbbell-row', 'dumbbells'),
  ('one-arm-dumbbell-row', 'bench'),
  ('barbell-bent-over-row', 'barbell'),
  ('face-pull', 'cable-station'),
  ('cable-fly', 'cable-crossover'),
  ('triceps-pushdown', 'cable-station'),
  ('ez-bar-curl', 'ez-bar'),
  ('dumbbell-curl', 'dumbbells'),
  ('hammer-curl', 'dumbbells'),
  ('ez-bar-skull-crusher', 'ez-bar'),
  ('ez-bar-skull-crusher', 'bench'),
  ('band-pull-apart', 'resistance-bands'),
  ('kettlebell-swing', 'kettlebells'),
  ('farmers-carry', 'dumbbells'),
  ('dumbbell-thruster', 'dumbbells'),
  ('hanging-knee-raise', 'pull-up-bar'),
  ('cable-crunch', 'cable-station')
) as m(exercise_slug, equipment_slug)
join exercises e on e.slug = m.exercise_slug
join equipment q on q.slug = m.equipment_slug
on conflict do nothing;
