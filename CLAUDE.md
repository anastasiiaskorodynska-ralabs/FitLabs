# FitLabs

Mobile-first PWA that generates weekly gym workouts with the Claude API,
based on each user's examples, history, equipment and rules.

## Stack
- Next.js (App Router), TypeScript strict, Tailwind CSS, shadcn/ui
- Supabase: Auth (one account, sign-ups disabled) + Postgres with RLS
  allowing only the authenticated user
- Claude API via @anthropic-ai/sdk, server-side only (never expose the key)
- next-intl for EN/UK, Zod for validation
- Deployed on Vercel

## Product rules
- Single-user app: no user_id columns, no sign-up, no coach role.
- Workouts are generated a whole week at a time; users can regenerate
  one exercise or a whole day, swap manually, and edit kg/reps/sets/rest.
- Logging happens after the workout: sets store target_* and actual_* values.
- Session structure: session -> blocks (single | superset | circuit) ->
  exercises -> sets. Circuits have rounds and rest_sec on the block.
- Support: per-set different kg, "max" reps, seconds instead of reps,
  per-side reps, bodyweight (null kg), technique description.
- Respect user training_rules in code AND prompt: allowed equipment only,
  abs finisher as the last block, no warm-up if no_warmup, no cardio machines
  if avoided.
- Units: kg.
- Every exercise shows images (from the library) and a video when
  video_url is set; otherwise a "Watch on YouTube" search link.
- Cardio machines = treadmill, elliptical, bike, rower.
- Logging: the form is pre-filled with targets; one tap marks a set "as
  planned"; notes per exercise and per session; Done or Skipped; "Save as
  example" stores the session as text in examples (source = log). Manual
  sessions that were never generated can be logged too.
- History: past sessions grouped by week, filter by type, per-exercise chart
  of actual kg over time.
- Out of scope for v1: multiple users, sharing, live workout mode (set
  ticking, rest timer), native apps, body measurements, photos, nutrition,
  plate calculator.

## AI generation
- Claude doesn't learn between calls: every request sends examples and recent
  history as context.
- Three actions:
  - Generate week: profile, schedule, rules, equipment, up to 6 examples per
    day type, last 4 weeks of logged sets -> a plan for every schedule day.
  - Regenerate day: same context + the current day -> one session.
  - Regenerate exercise: same context + the full session + which exercise +
    optional reason ("too hard", "no free bench") -> one block exercise,
    same muscle group.
- Models: current Sonnet for week and day generation, Haiku for single
  exercise regeneration. Check current model ids before building.
- Server flow: load context -> build prompt -> ask for JSON only -> validate
  with Zod -> if invalid, retry once with the validation error -> otherwise
  show an error. Save as sessions with status "planned".
- Prefer library exercises by id. New exercises from the AI are added to the
  library with name_en and name_uk (no images: placeholder + YouTube link).
- Volume (about 60 min): lower and upper days 6-9 exercises with supersets
  like the examples; functional circuit days 3 circuits x 3 rounds,
  3 exercises each, 60-90 s rest, a short technique description per
  exercise; every session ends with an abs block when abs_finisher is on.
- Vary exercises week to week but keep key lifts for progression.
- Progression: pass the last 1-3 logged performances per exercise. All target
  reps reached -> +2.5 kg on big lifts, +1-2 kg on dumbbells, or more reps;
  reps missed -> keep the weight.
- Examples are free text in any language (often Russian or Ukrainian); the plan
  is written in the user's app language.

## Media
- Images: free-exercise-db (public domain) with start and end position
  images; copy them to Supabase Storage rather than linking GitHub.
- Video: video_url per exercise (YouTube or Shorts link, embedded). Fallback
  search: exercise name_en + "technique".

## Schema notes
The build plan uses some older names; the real schema (supabase/migrations) is:
- example_workouts -> examples (day_type, raw_text, source pasted | log)
- session_blocks -> blocks; the abs finisher is blocks.role = 'finisher'
  (role: warmup | main | finisher)
- profile.onboarding_done -> profile.onboarded_at (null = not done);
  profile.language -> profile.locale; age is stored as birth_year
- focus / day_focus -> day_type (lower | upper | func | full)
- training_rules: avoid_terms[] (free-text exercises or equipment), notes
  (extra rules and injuries), abs_finisher, no_warmup, avoid_cardio_machines
- weekday is 0-6 (Monday = 0)
- Circuit exercises have one set row = the target per round; rest_sec is on
  the block for every block kind.
- Multi-table writes go through SQL functions (see migrations) so they are
  atomic.
- Migrations are applied by hand in the Supabase SQL editor: add a new
  migration file, never edit one that has already run.

## Code conventions
- All UI text in messages/en.json and messages/uk.json, never hard-coded.
- Exercise names come from the exercises table (name_en, name_uk).
- Mobile first: design for 390px width, tap targets >= 44px.
- AI output is validated with Zod before saving; retry once on failure.
- Prompts live in /lib/ai/prompts.ts; schemas in /lib/ai/schemas.ts.
- Designs from Claude Design are in /design; match them.
- Write small, focused components. Run lint and typecheck before finishing.
