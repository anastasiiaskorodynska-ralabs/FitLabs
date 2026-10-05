import type { GenerationContext } from "./context";

// Bump when the prompt or output contract changes; stored on weeks.prompt_version.
export const PROMPT_VERSION = "week-v1";

const LANGUAGE = { en: "English", uk: "Ukrainian" } as const;

// Stable instructions (no per-request data) so the prefix can be cached.
export const WEEK_SYSTEM_PROMPT = `You are an experienced strength and conditioning coach creating gym workouts for one person.
You plan a whole training week at once and return it as JSON.

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

Follow every rule in RULES exactly. Write titles and technique notes in the requested language.
Return only the JSON object, with one session for each requested date and no other text.`;

function line(label: string, value: unknown) {
  return value === null || value === undefined || value === "" ? null : `${label}: ${value}`;
}

export function buildWeekUserPrompt(ctx: GenerationContext) {
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
      "RULES (must always follow)",
      `- Warm-up: ${rules.noWarmup ? "NO warm-up blocks or warm-up sets" : "a short warm-up block is allowed"}`,
      `- Abs finisher: ${rules.absFinisher ? 'EVERY session must end with exactly one abs block (role "finisher") made only of abs/core exercises' : "optional"}`,
      `- Cardio machines (treadmill, elliptical, bike, rower): ${rules.avoidCardioMachines ? "never use" : "allowed"}`,
      `- Avoid these exercises or equipment: ${rules.avoidTerms.length ? rules.avoidTerms.join(", ") : "none"}`,
      rules.notes ? `- Extra rules, injuries and limitations: ${rules.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
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

  sections.push(
    [
      "TASK",
      `Create the plan for these dates, one session each:`,
      ...ctx.targets.map((t) => `- ${t.date}: ${t.dayType}`),
      `Each session should take about ${ctx.sessionLength} minutes.`,
      `Write titles and technique notes in ${LANGUAGE[ctx.locale]}.`,
    ].join("\n"),
  );

  return sections.join("\n\n");
}

export function buildRetryPrompt(errors: string[]) {
  return [
    "Your plan broke these rules:",
    ...errors.map((e) => `- ${e}`),
    "Return the complete corrected plan as JSON, fixing every problem above.",
  ].join("\n");
}
