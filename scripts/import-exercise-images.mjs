// Imports start/end photos from free-exercise-db (public domain) into the
// "exercise-images" Supabase Storage bucket and fills exercises.image_urls.
// Uses exercises.source_id, then scripts/exercise-images.json, then exact
// English-name matches (e.g. exercises the AI added). Safe to re-run.
//
// Run: node --env-file=.env.local scripts/import-exercise-images.mjs [--dry-run]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DATASET = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main";
const BUCKET = "exercise-images";
const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
const auth = { apikey: key, authorization: `Bearer ${key}` };

const { map } = JSON.parse(readFileSync(fileURLToPath(new URL("./exercise-images.json", import.meta.url)), "utf8"));
const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// fetch with a few retries: one dropped connection shouldn't stop a long import.
async function fetchRetry(input, init, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(input, init);
      if (res.status < 500 || i === tries) return res;
    } catch (error) {
      if (i === tries) throw error;
    }
    await new Promise((r) => setTimeout(r, 1000 * i));
  }
}

async function json(res) {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const dataset = await json(await fetch(`${DATASET}/dist/exercises.json`));
const byId = new Map(dataset.map((e) => [e.id, e]));
const byName = new Map(dataset.map((e) => [normalise(e.name), e]));

const exercises = await json(
  await fetch(`${url}/rest/v1/exercises?select=id,slug,name_en,source_id,image_urls`, { headers: auth }),
);
const done = [];
const missing = [];

for (const ex of exercises) {
  // Imported exercises know their source; the starter library uses the mapping file.
  const sourceId = ex.source_id ?? map[ex.slug];
  const source = sourceId ? byId.get(sourceId) : byName.get(normalise(ex.name_en));
  if (!source?.images?.length) {
    missing.push(ex.name_en);
    continue;
  }

  const urls = [];
  for (const [i, path] of source.images.slice(0, 2).entries()) {
    const ext = path.split(".").pop();
    const target = `${ex.slug}/${i}.${ext}`;
    if (!dryRun) {
      const image = await fetchRetry(`${DATASET}/exercises/${path}`);
      if (!image.ok) throw new Error(`download ${path}: ${image.status}`);
      const upload = await fetchRetry(`${url}/storage/v1/object/${BUCKET}/${target}`, {
        method: "POST",
        headers: { ...auth, "content-type": image.headers.get("content-type") ?? "image/jpeg", "x-upsert": "true" },
        body: Buffer.from(await image.arrayBuffer()),
      });
      if (!upload.ok) throw new Error(`upload ${target}: ${upload.status} ${await upload.text()}`);
    }
    urls.push(`${url}/storage/v1/object/public/${BUCKET}/${target}`);
  }

  if (!dryRun) {
    const update = await fetchRetry(`${url}/rest/v1/exercises?id=eq.${ex.id}`, {
      method: "PATCH",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ image_urls: urls }),
    });
    if (!update.ok) throw new Error(`update ${ex.slug}: ${update.status} ${await update.text()}`);
  }
  done.push(`${ex.name_en} <- ${source.id}`);
}

console.log(`${dryRun ? "[dry run] would import" : "Imported"} ${done.length} exercise(s):\n  ${done.join("\n  ")}`);
console.log(`\nNo photos (placeholder + YouTube link): ${missing.length ? missing.join(", ") : "none"}`);
