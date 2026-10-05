// Checks UI strings: en.json and uk.json have the same keys, every static
// t("key") used in code exists, and no visible text is hard-coded in JSX.
// Run: node scripts/check-messages.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const load = (locale) => JSON.parse(readFileSync(join(root, "messages", `${locale}.json`), "utf8"));

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const en = new Set(flatten(load("en")));
const uk = new Set(flatten(load("uk")));
const problems = [];

for (const key of en) if (!uk.has(key)) problems.push(`missing in uk.json: ${key}`);
for (const key of uk) if (!en.has(key)) problems.push(`missing in en.json: ${key}`);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const sources = ["app", "components", "lib"].flatMap((d) => files(join(root, d)));
const hasPrefix = (prefix) => [...en].some((k) => k === prefix || k.startsWith(`${prefix}.`));

for (const file of sources) {
  const code = readFileSync(file, "utf8");
  const rel = relative(root, file);

  // const t = useTranslations("NS") / await getTranslations("NS")
  const namespaces = new Map();
  for (const m of code.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\(\s*"([^"]+)"\s*\)/g)) {
    namespaces.set(m[1], m[2]);
  }
  for (const [fn, ns] of namespaces) {
    if (!hasPrefix(ns)) problems.push(`${rel}: namespace "${ns}" not in en.json`);
    for (const m of code.matchAll(new RegExp(`\\b${fn}(?:\\.has)?\\(\\s*"([^"]+)"`, "g"))) {
      const key = `${ns}.${m[1]}`;
      if (!en.has(key) && !hasPrefix(key)) problems.push(`${rel}: ${key} not in en.json`);
    }
    // Template keys: check the static prefix, e.g. t(`levels.${x}.label`) -> "levels".
    for (const m of code.matchAll(new RegExp(`\\b${fn}\\(\\s*\`([^\`$]+)\\$\\{`, "g"))) {
      const prefix = `${ns}.${m[1].replace(/\.$/, "")}`;
      if (!hasPrefix(prefix)) problems.push(`${rel}: ${prefix}.* not in en.json`);
    }
  }

  // Hard-coded visible text in components (JSX text and user-facing attributes).
  if (rel.endsWith(".tsx") && !code.includes("check-messages: allow-hardcoded")) {
    // Text between a closing ">" of a tag (not "=>") and the next "<"; code-like text is skipped.
    for (const m of code.matchAll(/(?<![=-])>\s*([A-Za-zА-Яа-яІіЇїЄє][^<>{}()=;]*?)\s*</g)) {
      problems.push(`${rel}: hard-coded text "${m[1].trim()}"`);
    }
    for (const m of code.matchAll(/\b(aria-label|placeholder|title|alt)="([^"]*[A-Za-zА-Яа-я][^"]*)"/g)) {
      problems.push(`${rel}: hard-coded ${m[1]}="${m[2]}"`);
    }
  }
}

if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`OK: ${en.size} keys in both languages, all used keys exist, no hard-coded text.`);
