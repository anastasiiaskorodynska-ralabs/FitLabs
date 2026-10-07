# FitLabs

Mobile-first PWA that plans a whole gym week with the Claude API, based on your example workouts, logged history, equipment and rules. You edit, regenerate or swap exercises, then log what you actually did. English and Ukrainian.

Product rules and code conventions are in [`CLAUDE.md`](CLAUDE.md); the Claude Design source is in [`/design`](design).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Auth + Postgres with RLS) · Claude API (`@anthropic-ai/sdk`) · next-intl · Zod · Vercel.

---

## 1. Run locally

Requires Node.js 20+ (LTS).

```bash
npm install
cp .env.example .env.local   # fill in the four values below
npm run dev
```

Open http://localhost:3000 and use the browser's phone view (390 × 844).

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → **Publishable** key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → **Secret** key (`sb_secret_…`). Server only — never commit or share it. |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (`sk-ant-…`) |

**Windows notes**
- If PowerShell says "running scripts is disabled", use `npm.cmd run dev`, or run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Don't keep the project inside OneDrive: it syncs `node_modules` and `.next` and slows builds.
- `swc-cache.config.ts` keeps a native compiler cache inside `node_modules/.swc` (see the comment there).

## 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (the free plan is enough).
2. **Authentication → Sign In / Providers:** keep **Email** on and turn **off** "Allow new users to sign up".
3. **Authentication → Users → Add user → Create new user:** your email and password, tick **Auto Confirm User**. This is the only account.
4. **SQL Editor:** run every file in [`supabase/migrations`](supabase/migrations) **in order**, one at a time:
   1. `20261002000000_initial_schema.sql` — tables and row-level security
   2. `20261005000000_onboarding.sql` — survey fields and equipment list
   3. `20261006000000_sessions.sql` — session editing and the 58-exercise library
   4. `20261007000000_ai_generation.sql` — saving generated weeks
   5. `20261008000000_regenerate.sql` — regenerate day / exercise
   6. `20261009000000_logging.sql` — log results
   7. `20261010000000_custom_rules.sql` — free-text training rules

   If Supabase warns "creates tables without enabling Row Level Security", choose **Run and enable RLS** (the migration enables it as well). Never edit a migration that has run — add a new file instead.
5. **Authentication → URL Configuration:** set **Site URL** to where the app runs and list every address under **Redirect URLs**:
   - local: `http://localhost:3000/**`
   - production: `https://<your-app>.vercel.app/**` (add after step 3 below)

## 3. Deploy to Vercel

1. Push the code to GitHub (`git push`).
2. On [vercel.com](https://vercel.com) → **Add New… → Project** → import the GitHub repository. Vercel detects Next.js; keep the default build settings.
3. Under **Environment Variables** add the same four variables as `.env.local` (Production and Preview).
4. Click **Deploy**. When it finishes, copy the URL (e.g. `https://fitlabs-xyz.vercel.app`).
5. In Supabase → **Authentication → URL Configuration**: set **Site URL** to that URL and add `https://<your-url>/**` to **Redirect URLs**, so magic links open the deployed app.
6. Open the URL on your phone, sign in, then install it:
   - **iPhone (Safari):** Share → **Add to Home Screen**
   - **Android (Chrome):** menu → **Install app**

Every push to `main` deploys again automatically. AI routes allow up to 300 s (`maxDuration`), which fits Vercel's default function limit.

## 4. Costs

Supabase and Vercel free plans cover one user. Only Claude calls cost money: a generated week (Sonnet) is a few cents; regenerating one exercise (Haiku) is a fraction of a cent. Set a monthly spend limit in the Anthropic Console.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run check:messages` | EN/UK keys match, every used key exists, no hard-coded UI text |

## Structure

- `app/(tabs)/` — Week, History, Examples, Profile (bottom tab bar)
- `app/session/[id]/` — session detail; `log/` — Log results
- `app/onboarding/`, `app/login/`, `app/auth/callback/` — survey and sign-in
- `app/api/` — `generate-week`, `regenerate-day`, `regenerate-exercise` (Claude)
- `lib/ai/` — context loading, prompts (`prompts.ts`), schemas (`schemas.ts`), rule checks (`rules.ts`), saving
- `lib/sessions/`, `lib/history/`, `lib/log/` — data loading and formatting
- `components/` — screens and shared controls, grouped by feature
- `messages/en.json`, `messages/uk.json` — every UI string
- `supabase/migrations/` — schema, RLS and SQL functions (multi-table writes are atomic)
- `public/sw.js` — service worker (offline page, cached assets); `app/manifest.ts` — PWA manifest
- `proxy.ts` — refreshes the Supabase session and redirects signed-out visitors (Next 16 "proxy", formerly middleware)
