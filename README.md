# FitLabs

Mobile-first PWA that generates weekly gym workouts with the Claude API. See `CLAUDE.md` for product rules and conventions, and `/design` for the Claude Design source.

## Run locally

Requires Node.js 20+ (LTS).

```bash
npm install
cp .env.example .env.local   # then fill in the real keys
npm run dev
```

Open http://localhost:3000 and use the browser's mobile view (390 × 844).

## Scripts

| Command             | What it does                 |
| ------------------- | ---------------------------- |
| `npm run dev`       | Dev server with hot reload   |
| `npm run build`     | Production build             |
| `npm run start`     | Serve the production build   |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | TypeScript, no emit          |

## Structure

- `app/(tabs)/` — Week, History, Examples, Profile, sharing the bottom tab bar
- `components/app-shell/` — tab bar and page header
- `i18n/`, `messages/` — next-intl (locale in the `NEXT_LOCALE` cookie, no URL prefix)
- `lib/supabase/` — browser, server and proxy clients (`@supabase/ssr`)
- `proxy.ts` — refreshes the Supabase session on each request (Next 16 "proxy", formerly middleware)
- `app/manifest.ts`, `public/icons/` — PWA manifest and placeholder icons
