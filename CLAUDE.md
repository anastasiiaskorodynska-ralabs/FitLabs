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

## Code conventions
- All UI text in messages/en.json and messages/uk.json, never hard-coded.
- Exercise names come from the exercises table (name_en, name_uk).
- Mobile first: design for 390px width, tap targets >= 44px.
- AI output is validated with Zod before saving; retry once on failure.
- Prompts live in /lib/ai/prompts.ts; schemas in /lib/ai/schemas.ts.
- Designs from Claude Design are in /design; match them.
- Write small, focused components. Run lint and typecheck before finishing.
