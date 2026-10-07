import type { GenerationContext } from "./context";

// Bump when the prompt or output contract changes; stored on weeks.prompt_version.
export const PROMPT_VERSION = "plan-v3";

const LANGUAGE = { en: "English", uk: "Ukrainian" } as const;

// Stable instructions (no per-request data) so the prefix can be cached.
// Shared by week, day and exercise generation; TASK says which one is wanted.
export const PLAN_SYSTEM_PROMPT = `You are an experienced strength and conditioning coach creating gym workouts for one person.
You plan a whole training week, one session, or a replacement for one exercise, as the TASK says, and return it as JSON.

How the plan is structured:
- Each session is a list of blocks. A block is "single" (one exercise), "superset" (2-3 exercises done back to back, then rest) or "circuit" (2-4 exercises done in a row for several rounds).
- Each exercise has its own sets. Sets can differ: e.g. 2 sets of 35 kg × 10 then 2 sets of 30 kg × 12 are four separate set entries.
- kg null means bodyweight. "max": true means as many reps as possible (reps must then be null). Timed exercises use measure "seconds" with seconds set and reps null. per_side true means the reps or seconds count per leg or arm.
- In a circuit, rounds and rest_sec live on the block and each exercise has exactly one set: the target for one round. Other blocks have rounds null.
- rest_sec on a single block is rest between sets; on a superset, rest after the last exercise of each round; on a circuit, rest between rounds.
- role "finisher" marks the abs block at the end of a session. role "warmup" marks a warm-up block. Everything else is "main".

Choosing exercises:
- Pick exercises from the EXERCISE LIBRARY by exercise_id whenever one fits (new_exercise null). Library ids are the only valid ids.
- Only if nothing in the library fits, set exercise_id to null and describe a new_exercise with an English and a Ukrainian name, its muscles, the equipment slugs it needs (only from AVAILABLE EQUIPMENT; empty for bodyweight) and three short technique steps in both languages.
- Never plan an exercise that needs equipment the user doesn't have, matches anything in the avoid list, or uses a cardio machine when those are avoided.

Style:
- Copy the structure, volume, exercise choices, combinations (supersets, drop sets, circuits) and abs finisher style of the user's example workouts. Examples can be in any language.
- Lower and upper days: 6-9 exercises, with supersets like in the examples.
- Functional circuit days: 3 circuits × 3 rounds, 3 exercises each, 60-90 s rest between rounds, and a short technique_note for every exercise.
- Full body days: a balanced mix of lower, upper and core work.
- Fit each session into the stated session length.
- Vary exercises from week to week, but keep the key lifts so progress can be tracked.

Progression (use RECENT PERFORMANCES):
- If the user reached all target reps last time, add 2.5 kg on big barbell or machine lifts, 1-2 kg on dumbbells, or add reps.
- If they missed reps, keep the weight.
- With no history, choose conservative starting weights for the user's level, sex and body weight.

The user's rules:
- RULES lists the user's own rules in their words (injuries, structure, timing, preferences). They come before style, examples and volume guidance: if an example or a guideline conflicts with a rule, the rule wins.
- Add a warm-up block or an abs finisher only when the rules or the examples call for one. A rule like "always finish with abs" means every session ends with exactly one abs block (role "finisher") of abs/core exercises; "no warm-up" means no warm-up blocks or warm-up sets.
- Before answering, check every session against each rule one by one and fix anything that breaks one.

Write titles, technique notes and reasons in the requested language.
Return only the JSON object the TASK asks for, with no other text.`;

function line(label: string, value: unknown) {
  return value === null || value === undefined || value === "" ? null : `${label}: ${value}`;
}

// Profile, rules, equipment, library, examples and history: shared by every action.
function contextSections(ctx: GenerationContext) {
  const { profile, rules } = ctx;
  const sections: string[] = [];

  sections.push(
    [
      "USER PROFILE",
      line("Name", profile.name),
      line("Sex", profile.sex),
      line("Age", profile.age),
      line("Height (cm)", profile.heightCm),
      line("Weight (kg)", profile.weightKg),
      line("Experience", profile.level),
      line("Goal", profile.goal),
    ]
      .filter(Boolean)
      .join("\n"),
  );

  sections.push(
    [
      "RULES (must always follow, in every session)",
      "The user's own rules (any language):",
      ...(rules.custom.length ? rules.custom.map((r, i) => `${i + 1}. ${r}`) : ["(none)"]),
      `Never plan these exercises or equipment: ${rules.avoidTerms.length ? rules.avoidTerms.join(", ") : "none"}`,
      `Cardio machines (treadmill, elliptical, bike, rower): ${rules.avoidCardioMachines ? "never use" : "allowed"}`,
    ].join("\n"),
  );

  sections.push(
    [
      "AVAILABLE EQUIPMENT (slug: name)",
      ...(ctx.equipment.length ? ctx.equipment.map((q) => `- ${q.slug}: ${q.name}`) : ["- none (bodyweight only)"]),
    ].join("\n"),
  );

  const allowed = ctx.library.filter((e) => e.allowed);
  sections.push(
    [
      "EXERCISE LIBRARY (id | name | muscles | equipment | measure | flags)",
      ...allowed.map((e) =>
        [
          e.id,
          e.nameEn,
          e.muscles.join(","),
          e.equipmentSlugs.length ? e.equipmentSlugs.join("+") : "bodyweight",
          e.measure,
          [e.isAbs && "abs", e.perSide && "per side", e.isBodyweight && "bodyweight"].filter(Boolean).join(",") || "-",
        ].join(" | "),
      ),
    ].join("\n"),
  );

  const examples = ctx.examples.length
    ? ctx.examples
        .map((e, i) => `--- Example ${i + 1} (${e.dayType ?? "any day type"}${e.title ? `: ${e.title}` : ""}) ---\n${e.text.trim()}`)
        .join("\n\n")
    : "No examples yet. Use a classic, well-balanced structure.";
  sections.push(`STYLE REFERENCE - the user's own example workouts\n${examples}`);

  const performances = [...ctx.performances.entries()].map(([id, list]) => {
    const name = ctx.library.find((e) => e.id === id)?.nameEn ?? id;
    return `- ${name}: ${list.map((p) => `${p.date}: ${p.sets}`).join(" | ")}`;
  });
  sections.push(
    [
      "RECENT PERFORMANCES (last 4 weeks, what was actually done, newest first)",
      ...(performances.length ? performances : ["No logged workouts yet."]),
    ].join("\n"),
  );

  return sections;
}

const reasonLine = (reason?: string) =>
  reason?.trim() ? `The user's reason (follow it): "${reason.trim()}"` : null;

export function buildWeekUserPrompt(ctx: GenerationContext) {
  return [
    ...contextSections(ctx),
    [
      "TASK",
      `Create the plan for these dates, one session each:`,
      ...ctx.targets.map((t) => `- ${t.date}: ${t.dayType}`),
      `Each session should take about ${ctx.sessionLength} minutes.`,
      `Write titles and technique notes in ${LANGUAGE[ctx.locale]}.`,
      `Return {"sessions": [...]}.`,
    ].join("\n"),
  ].join("\n\n");
}

// `current` describes the session as it is now (empty = build from scratch).
export function buildDayUserPrompt(ctx: GenerationContext, current: string[], reason?: string) {
  const target = ctx.targets[0];
  return [
    ...contextSections(ctx),
    current.length
      ? ["CURRENT SESSION (replace it with a new version)", ...current].join("\n")
      : "CURRENT SESSION: empty - create it from scratch.",
    [
      "TASK",
      `Create one session for ${target.date} (${target.dayType}) to replace the current one.`,
      current.length ? "Keep what suits the user, but change it noticeably; don't return the same session." : null,
      reasonLine(reason),
      `It should take about ${ctx.sessionLength} minutes.`,
      `Write the title and technique notes in ${LANGUAGE[ctx.locale]}.`,
      `Return {"sessions": [one session]}.`,
    ]
      .filter(Boolean)
      .join("\n"),
  ].join("\n\n");
}

export function buildExerciseUserPrompt(
  ctx: GenerationContext,
  session: string[],
  target: { name: string; muscles: string[]; where: string; blockKind: string; isFinisher: boolean },
  count: number,
  reason?: string,
) {
  return [
    ...contextSections(ctx),
    ["CURRENT SESSION", ...session].join("\n"),
    [
      "TASK",
      `Replace "${target.name}" (${target.where}).`,
      `Keep the same muscle group: the replacement must train at least one of: ${target.muscles.join(", ")}.`,
      target.isFinisher ? "It is in the abs finisher, so it must be an abs/core exercise." : null,
      target.blockKind === "circuit"
        ? "It is in a circuit: give exactly one set (the target per round)."
        : "Keep a similar number of sets and a similar effort.",
      "Don't repeat an exercise that is already in the session.",
      reasonLine(reason),
      `Return {"options": [...]} with ${count} different option${count === 1 ? "" : "s"}, best first. "why" is one short sentence in ${LANGUAGE[ctx.locale]} saying why it fits.`,
    ]
      .filter(Boolean)
      .join("\n"),
  ].join("\n\n");
}

export function buildRetryPrompt(errors: string[]) {
  return [
    "Your answer broke these rules:",
    ...errors.map((e) => `- ${e}`),
    "Return the complete corrected JSON, fixing every problem above.",
  ].join("\n");
}
