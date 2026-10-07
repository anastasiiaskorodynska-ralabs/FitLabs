// Grows the exercise library from free-exercise-db (public domain).
//
//   node --env-file=.env.local scripts/build-exercise-library.mjs --dry-run
//     Pick and map exercises, print a summary. No AI calls, nothing saved.
//   node --env-file=.env.local scripts/build-exercise-library.mjs
//     Same, plus Ukrainian names and 3-step technique (EN/UK) written by Claude,
//     saved to scripts/data/exercise-library.json for review. Already
//     translated entries are reused, so re-runs only translate new ones.
//   node --env-file=.env.local scripts/build-exercise-library.mjs --insert
//     Add the reviewed file's exercises to the database (existing ones are
//     left alone), then run `npm run import:images` for their photos.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const DATASET = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const MODEL = "claude-sonnet-5-5";
const BATCH = 20;
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const OUT = here("./data/exercise-library.json");
const mode = process.argv.includes("--insert") ? "insert" : process.argv.includes("--dry-run") ? "dry" : "build";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
const auth = { apikey: key, authorization: `Bearer ${key}` };

async function json(res) {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ---------------------------------------------------------------------------
// Mapping from the dataset to the FitLabs library
// ---------------------------------------------------------------------------

const KEEP_CATEGORIES = new Set(["strength", "plyometrics"]);
// Specialist variants that add noise rather than choice.
const SKIP_NAMES = /with (bands|chains)|- with bands|chains|behind the neck|bosu|on an exercise ball|suspended|isometric neck/i;
// Most exercises per primary muscle, so the library stays varied but focused.
const PER_MUSCLE = 14;
const PER_SMALL_MUSCLE = { forearms: 4, traps: 5, calves: 6, adductors: 5 };

const MUSCLE = {
  abdominals: "abs", abductors: "glutes", adductors: "adductors", biceps: "biceps", calves: "calves",
  chest: "chest", forearms: "forearms", glutes: "glutes", hamstrings: "hamstrings", lats: "lats",
  "lower back": "back", "middle back": "back", quadriceps: "quads", shoulders: "shoulders",
  traps: "traps", triceps: "triceps",
};
const LOWER = new Set(["quads", "hamstrings", "glutes", "calves", "adductors"]);
const UPPER = new Set(["chest", "shoulders", "triceps", "biceps", "lats", "back", "traps", "forearms"]);

const has = (re, name) => re.test(name);

// Equipment slugs an exercise needs, or null when it can't be mapped (skipped).
function equipmentFor(e) {
  const n = e.name.toLowerCase();
  const bench = /\bbench\b|incline|decline|lying|prone|hip thrust|pullover|seated/.test(n) ? ["bench"] : [];
  switch (e.equipment) {
    case "barbell":
      return ["barbell", ...bench];
    case "dumbbell":
      return ["dumbbells", ...(bench.length || /\bfly|flye|row\b/.test(n) ? ["bench"] : [])].filter((v, i, a) => a.indexOf(v) === i);
    case "kettlebells":
      return ["kettlebells"];
    case "e-z curl bar":
      return ["ez-bar", ...(/lying|incline|decline|skull/.test(n) ? ["bench"] : [])];
    case "cable":
      return [/crossover|\bfly|flye/.test(n) ? "cable-crossover" : "cable-station"];
    case "bands":
      return ["resistance-bands"];
    case "medicine ball":
      return ["medicine-ball"];
    case "exercise ball":
      return ["stability-ball"];
    case "machine":
      if (has(/smith/i, n)) return ["smith-machine"];
      if (has(/hack squat/i, n)) return ["hack-squat"];
      if (has(/leg press/i, n)) return ["leg-press"];
      if (has(/leg curl|leg extension/i, n)) return ["leg-curl-extension"];
      if (has(/pulldown/i, n)) return ["lat-pulldown"];
      if (has(/chest press|machine bench press/i, n)) return ["chest-press-machine"];
      if (has(/butterfly|machine fl(y|ye)/i, n)) return ["pec-deck"];
      if (has(/shoulder press|military press/i, n)) return ["shoulder-press-machine"];
      if (has(/calf/i, n)) return ["calf-machine"];
      if (has(/abductor|adductor/i, n)) return ["hip-abductor-adductor"];
      if (has(/hyperextension|back extension/i, n)) return ["back-extension"];
      return null;
    case "body only":
    case "other":
    case null:
    case undefined:
      if (has(/hyperextension|back extension/i, n)) return ["back-extension"];
      if (has(/ab roller|ab wheel/i, n)) return ["ab-wheel"];
      if (has(/\bdips?\b/i, n)) return ["dip-station"];
      if (has(/pull-?ups?|chin-?ups?|hanging|muscle up/i, n)) return ["pull-up-bar"];
      if (has(/\bbox\b|step-?up/i, n)) return ["plyo-box"];
      if (e.equipment === "body only") return /\bbench\b/.test(n) ? ["bench"] : [];
      return null;
    default:
      return null; // foam roll etc.
  }
}

function toEntry(e) {
  if (!KEEP_CATEGORIES.has(e.category) || e.level === "expert" || !e.images?.length) return null;
  if (SKIP_NAMES.test(e.name)) return null;
  if (e.primaryMuscles.includes("neck")) return null;
  const equipment = equipmentFor(e);
  if (!equipment) return null;

  const muscles = [...new Set([...e.primaryMuscles, ...e.secondaryMuscles].map((m) => MUSCLE[m]).filter(Boolean))];
  const primary = e.primaryMuscles.map((m) => MUSCLE[m]).filter(Boolean);
  if (!primary.length) return null;
  const isAbs = primary.includes("abs");
  const dayTypes = new Set();
  if (isAbs) ["lower", "upper", "func"].forEach((d) => dayTypes.add(d));
  // Deadlifts and back extensions (lower back) belong on lower-body days.
  const lowerBack = e.primaryMuscles.includes("lower back");
  if (lowerBack || primary.some((m) => LOWER.has(m))) dayTypes.add("lower");
  if (!lowerBack && primary.some((m) => UPPER.has(m))) dayTypes.add("upper");
  if (e.category === "plyometrics" || ["kettlebells", "medicine ball", "body only", "bands"].includes(e.equipment)) {
    dayTypes.add("func");
  }
  const n = e.name.toLowerCase();
  const onlyLightGear = equipment.every((s) => ["bench", "pull-up-bar", "dip-station", "plyo-box", "stability-ball", "ab-wheel"].includes(s));

  return {
    source_id: e.id,
    slug: `fedb-${e.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    source_name: e.name,
    instructions: e.instructions,
    muscle_groups: primary.concat(muscles.filter((m) => !primary.includes(m))),
    day_types: [...dayTypes],
    equipment_slugs: equipment,
    default_measure: /plank|\bhold\b|isometric|farmer|carry|wall sit|static|side bridge/.test(n) ? "seconds" : "reps",
    per_side: /one[- ]arm|one[- ]leg|single[- ]arm|single[- ]leg|alternat|side bridge|lunge|step[- ]?up|split squat|unilateral/.test(n),
    is_bodyweight: onlyLightGear,
    is_abs: isAbs,
    // For ranking only (not stored): beginner and compound first, then plain names.
    rank: (e.level === "beginner" ? 0 : 2) + (e.mechanic === "compound" ? 0 : 1) + e.name.length / 100,
  };
}

// Keeps the best-ranked PER_MUSCLE exercises for each primary muscle.
function capPerMuscle(entries) {
  const kept = [];
  const perMuscle = new Map();
  for (const e of [...entries].sort((a, b) => a.rank - b.rank)) {
    const muscle = e.muscle_groups[0];
    const n = perMuscle.get(muscle) ?? 0;
    if (n >= (PER_SMALL_MUSCLE[muscle] ?? PER_MUSCLE)) continue;
    perMuscle.set(muscle, n + 1);
    kept.push(e);
  }
  return kept;
}

// ---------------------------------------------------------------------------

const dataset = await json(await fetch(DATASET));
// source_id comes with the bigger_library migration; before it runs, preview without it.
const withSource = await fetch(`${url}/rest/v1/exercises?select=slug,name_en,source_id`, { headers: auth });
const existing = withSource.ok
  ? await withSource.json()
  : await json(await fetch(`${url}/rest/v1/exercises?select=slug,name_en`, { headers: auth }));
const { map: imageMap } = JSON.parse(readFileSync(here("./exercise-images.json"), "utf8"));
const taken = new Set([...Object.values(imageMap), ...existing.map((e) => e.source_id).filter(Boolean)]);
const takenNames = new Set(existing.map((e) => normalise(e.name_en)));

if (mode === "insert") {
  const { exercises } = JSON.parse(readFileSync(OUT, "utf8"));
  const equipment = await json(await fetch(`${url}/rest/v1/equipment?select=id,slug`, { headers: auth }));
  const equipmentId = new Map(equipment.map((q) => [q.slug, q.id]));
  // Skip what's already in the library, and repeated names within the file (first wins).
  const seenNames = new Set(takenNames);
  const fresh = exercises.filter((e) => {
    const name = normalise(e.name_en);
    if (taken.has(e.source_id) || seenNames.has(name)) return false;
    seenNames.add(name);
    return true;
  });

  const inserted = await json(
    await fetch(`${url}/rest/v1/exercises?on_conflict=slug`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(
        fresh.map((e) => ({
          slug: e.slug,
          source_id: e.source_id,
          name_en: e.name_en,
          name_uk: e.name_uk,
          muscle_groups: e.muscle_groups,
          day_types: e.day_types,
          default_measure: e.default_measure,
          per_side: e.per_side,
          is_bodyweight: e.is_bodyweight,
          is_abs: e.is_abs,
          technique_en: e.technique_en,
          technique_uk: e.technique_uk,
        })),
      ),
    }),
  );
  const idBySlug = new Map(inserted.map((r) => [r.slug, r.id]));
  const links = fresh.flatMap((e) =>
    idBySlug.has(e.slug) ? e.equipment_slugs.map((s) => ({ exercise_id: idBySlug.get(e.slug), equipment_id: equipmentId.get(s) })) : [],
  );
  if (links.some((l) => !l.equipment_id)) throw new Error("Unknown equipment slug — run the bigger_library migration first.");
  if (links.length) {
    await json(
      await fetch(`${url}/rest/v1/exercise_equipment?on_conflict=exercise_id,equipment_id`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(links),
      }).then(async (r) => (r.ok ? { ok: true } : r)),
    );
  }
  console.log(`Inserted ${inserted.length} exercise(s) with ${links.length} equipment link(s). Now run: npm run import:images`);
  process.exit(0);
}

const picked = capPerMuscle(
  dataset.map(toEntry).filter((e) => e && !taken.has(e.source_id) && !takenNames.has(normalise(e.source_name))),
).map((e) => {
  delete e.rank;
  return e;
});

const count = (f) =>
  Object.entries(picked.reduce((m, e) => { for (const v of [].concat(f(e))) m[v] = (m[v] || 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
console.log(`${picked.length} new exercises (library has ${existing.length}).`);
console.log(`By day type: ${count((e) => e.day_types)}`);
console.log(`By equipment: ${count((e) => (e.equipment_slugs.length ? e.equipment_slugs : ["bodyweight"]))}`);
if (mode === "dry") process.exit(0);

// Translations: reuse what's already in the file, ask Claude for the rest.
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")).exercises : [];
const done = new Map(previous.map((e) => [e.source_id, e]));
const todo = picked.filter((e) => !done.has(e.source_id));

const TextSchema = z.object({
  items: z.array(
    z.object({
      source_id: z.string(),
      name_en: z.string().describe("Clear, short English gym name in sentence case, e.g. 'Barbell full squat'"),
      name_uk: z.string().describe("Natural Ukrainian gym name"),
      technique_en: z.string().describe("Exactly 3 short steps separated by newlines, no numbering"),
      technique_uk: z.string().describe("The same 3 steps in Ukrainian, separated by newlines"),
    }),
  ),
});

const client = new Anthropic();
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: { type: "json_schema", schema: betaZodOutputFormat(TextSchema).schema } },
    system:
      "You write exercise names and technique notes for a gym app used in English and Ukrainian. " +
      "Names: short and recognisable, as a coach would say them. Technique: exactly 3 short, practical steps " +
      "(setup, movement, key cue), based on the given instructions.",
    messages: [
      {
        role: "user",
        content: JSON.stringify(batch.map((e) => ({ source_id: e.source_id, name: e.source_name, instructions: e.instructions }))),
      },
    ],
  });
  if (response.stop_reason !== "end_turn") throw new Error(`Claude stopped with ${response.stop_reason}`);
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const { items } = TextSchema.parse(JSON.parse(text));
  const byId = new Map(items.map((t) => [t.source_id, t]));
  for (const e of batch) {
    const t = byId.get(e.source_id);
    if (t) done.set(e.source_id, { ...e, ...t });
  }
  console.log(`translated ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
}

const exercises = picked
  .filter((e) => done.has(e.source_id))
  .map((e) => {
    const entry = { ...done.get(e.source_id) };
    delete entry.instructions; // only needed for translating
    return entry;
  });
mkdirSync(here("./data"), { recursive: true });
writeFileSync(OUT, JSON.stringify({ source: DATASET, exercises }, null, 2) + "\n");
console.log(`Wrote ${exercises.length} exercises to scripts/data/exercise-library.json — review it, then run with --insert.`);
