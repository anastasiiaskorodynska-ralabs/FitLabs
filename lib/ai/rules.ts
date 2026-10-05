import { matchesAvoidTerm } from "@/lib/exercises/allowed";
import type { GenerationContext } from "./context";
import type { AiBlock, AiBlockExercise, AiExerciseOption, AiSession, AiSet, AiWeekPlan } from "./schemas";

// Enforces the user's training rules in code (not only in the prompt) and
// normalises small things the model may get slightly wrong. Each check
// returns the errors to send back on retry; none means it can be saved.

const LIMITS = {
  restSec: { min: 0, max: 300 },
  rounds: { min: 1, max: 10 },
  sets: { min: 1, max: 8 },
  reps: { min: 1, max: 100 },
  seconds: { min: 5, max: 600 },
  kg: { min: 0, max: 400 },
  exercisesPerSession: { min: 3, max: 16 },
  maxErrors: 25,
};

const inRange = (n: number | null, r: { min: number; max: number }) => n !== null && n >= r.min && n <= r.max;

type Resolved = { item: AiBlockExercise; isAbs: boolean; muscles: string[]; libraryId: string | null };

// Checks for one exercise inside a block, collecting errors into `errors`.
function exerciseChecker(ctx: GenerationContext, errors: string[]) {
  const byId = new Map(ctx.library.map((e) => [e.id, e]));
  const byName = new Map(ctx.library.map((e) => [e.nameEn.trim().toLowerCase(), e]));
  const availableSlugs = new Set(ctx.equipment.map((q) => q.slug));
  const cardioSlugs = new Set(ctx.equipment.filter((q) => q.isCardioMachine).map((q) => q.slug));

  const resolve = (raw: AiBlockExercise, where: string): Resolved | null => {
    let item = raw;
    // A "new" exercise that already exists in the library becomes a library reference.
    if (!item.exercise_id && item.new_exercise) {
      const existing = byName.get(item.new_exercise.name_en.trim().toLowerCase());
      if (existing) item = { ...item, exercise_id: existing.id, new_exercise: null };
    }

    if (item.exercise_id) {
      const entry = byId.get(item.exercise_id);
      if (!entry) {
        errors.push(`${where}: exercise_id ${item.exercise_id} is not in the library.`);
        return null;
      }
      if (!entry.allowed) {
        errors.push(`${where}: "${entry.nameEn}" needs equipment the user doesn't have or is on the avoid list. Replace it.`);
        return null;
      }
      return { item: { ...item, new_exercise: null }, isAbs: entry.isAbs, muscles: entry.muscles, libraryId: entry.id };
    }

    const n = item.new_exercise;
    if (!n) {
      errors.push(`${where}: give either exercise_id or new_exercise.`);
      return null;
    }
    if (!n.name_en.trim() || !n.name_uk.trim()) errors.push(`${where}: a new exercise needs name_en and name_uk.`);
    const missing = n.equipment_slugs.filter((slug) => !availableSlugs.has(slug));
    if (missing.length) errors.push(`${where}: "${n.name_en}" uses unavailable equipment (${missing.join(", ")}).`);
    if (ctx.rules.avoidCardioMachines && n.equipment_slugs.some((slug) => cardioSlugs.has(slug))) {
      errors.push(`${where}: "${n.name_en}" uses a cardio machine, which the user avoids.`);
    }
    if (matchesAvoidTerm([n.name_en, n.name_uk], ctx.rules.avoidTerms)) {
      errors.push(`${where}: "${n.name_en}" matches the avoid list (${ctx.rules.avoidTerms.join(", ")}).`);
    }
    return { item: { ...item, exercise_id: null }, isAbs: n.is_abs, muscles: n.muscle_groups, libraryId: null };
  };

  const checkSet = (set: AiSet, item: AiBlockExercise, where: string): AiSet => {
    if (set.kg !== null && !inRange(set.kg, LIMITS.kg)) errors.push(`${where}: kg ${set.kg} is out of range.`);
    if (item.measure === "seconds") {
      if (!inRange(set.seconds, LIMITS.seconds)) errors.push(`${where}: timed sets need seconds between 5 and 600.`);
      return { ...set, reps: null, max: false };
    }
    if (set.max) return { ...set, reps: null, seconds: null };
    if (!inRange(set.reps, LIMITS.reps)) errors.push(`${where}: reps must be 1-100, or set max to true.`);
    return { ...set, seconds: null };
  };

  // Resolves the exercise and checks its sets for the block it sits in.
  return (raw: AiBlockExercise, blockKind: AiBlock["kind"], where: string) => {
    const resolved = resolve(raw, where);
    if (!resolved) return null;
    const item = resolved.item;
    if (blockKind === "circuit" && item.sets.length !== 1) {
      errors.push(`${where}: circuit exercises have exactly one set (the target per round).`);
    }
    if (blockKind !== "circuit" && (item.sets.length < LIMITS.sets.min || item.sets.length > LIMITS.sets.max)) {
      errors.push(`${where}: use 1-8 sets.`);
    }
    const sets = item.sets.map((set, si) => checkSet(set, item, `${where} set ${si + 1}`));
    return { ...resolved, item: { ...item, sets } };
  };
}

function checkSession(s: AiSession, ctx: GenerationContext, errors: string[]): AiSession {
  const check = exerciseChecker(ctx, errors);
  const blocks: AiBlock[] = [];
  let exerciseCount = 0;
  let finisherCount = 0;

  s.blocks.forEach((b, bi) => {
    const where = `${s.date} block ${bi + 1}`;
    const isLast = bi === s.blocks.length - 1;

    if (b.role === "warmup" && ctx.rules.noWarmup) errors.push(`${where}: the user does not warm up. Remove warm-up blocks.`);
    if (b.role === "finisher") {
      finisherCount++;
      if (!isLast) errors.push(`${where}: the abs finisher must be the last block.`);
    }
    if (!inRange(b.rest_sec, LIMITS.restSec)) errors.push(`${where}: rest_sec must be 0-300.`);

    const count = b.exercises.length;
    if (b.kind === "single" && count !== 1) errors.push(`${where}: a single block has exactly one exercise.`);
    if (b.kind !== "single" && count < 2) errors.push(`${where}: a ${b.kind} needs at least two exercises.`);
    if (b.kind === "circuit" && !inRange(b.rounds, LIMITS.rounds)) errors.push(`${where}: a circuit needs rounds between 1 and 10.`);

    const exercises: AiBlockExercise[] = [];
    let allAbs = true;
    b.exercises.forEach((raw, ei) => {
      const result = check(raw, b.kind, `${where} exercise ${ei + 1}`);
      if (!result) return;
      allAbs &&= result.isAbs;
      exercises.push(result.item);
    });

    if (b.role === "finisher" && !allAbs) errors.push(`${where}: the abs finisher may only contain abs/core exercises.`);
    exerciseCount += count;
    blocks.push({ ...b, rounds: b.kind === "circuit" ? b.rounds : null, exercises });
  });

  if (ctx.rules.absFinisher) {
    if (finisherCount !== 1 || s.blocks.at(-1)?.role !== "finisher") {
      errors.push(`${s.date}: the session must end with exactly one abs finisher block (role "finisher").`);
    }
  } else if (finisherCount > 1) {
    errors.push(`${s.date}: use at most one finisher block.`);
  }
  if (exerciseCount < LIMITS.exercisesPerSession.min || exerciseCount > LIMITS.exercisesPerSession.max) {
    errors.push(`${s.date}: plan between 3 and 16 exercises (now ${exerciseCount}).`);
  }

  return { ...s, blocks };
}

export type CheckResult<T> = { value: T; errors: string[] };

// Week or day: exactly the requested dates (ctx.targets), each checked.
export function checkWeekPlan(raw: AiWeekPlan, ctx: GenerationContext): CheckResult<AiWeekPlan> {
  const errors: string[] = [];
  const targetByDate = new Map(ctx.targets.map((t) => [t.date, t.dayType]));
  const seen = new Set<string>();
  const sessions: AiSession[] = [];

  for (const s of raw.sessions) {
    const dayType = targetByDate.get(s.date);
    if (!dayType) {
      errors.push(`Session on ${s.date} was not requested. Only plan: ${ctx.targets.map((t) => t.date).join(", ")}.`);
      continue;
    }
    if (seen.has(s.date)) {
      errors.push(`There are two sessions on ${s.date}; plan exactly one.`);
      continue;
    }
    seen.add(s.date);
    sessions.push(checkSession({ ...s, day_type: dayType }, ctx, errors)); // the schedule decides the focus
  }
  for (const t of ctx.targets) {
    if (!seen.has(t.date)) errors.push(`Missing the session on ${t.date} (${t.dayType}).`);
  }

  return { value: { sessions }, errors: errors.slice(0, LIMITS.maxErrors) };
}

export type ExerciseSlot = {
  blockKind: AiBlock["kind"];
  isFinisher: boolean;
  muscles: string[]; // the replaced exercise's muscles: "same muscle group"
  excludeIds: string[]; // exercises already in the session
};

// Replacement options for one exercise. Invalid options are dropped when at
// least one valid option remains; otherwise the errors go back on retry.
export function checkExerciseOptions(
  options: AiExerciseOption[],
  ctx: GenerationContext,
  slot: ExerciseSlot,
  count: number,
): CheckResult<AiExerciseOption[]> {
  const valid: AiExerciseOption[] = [];
  const allErrors: string[] = [];
  const seen = new Set<string>();

  options.forEach((option, i) => {
    const errors: string[] = [];
    const where = `Option ${i + 1}`;
    const result = exerciseChecker(ctx, errors)(option.exercise, slot.blockKind, where);
    if (result) {
      const key = result.libraryId ?? result.item.new_exercise?.name_en.trim().toLowerCase() ?? "";
      if (result.libraryId && slot.excludeIds.includes(result.libraryId)) {
        errors.push(`${where}: that exercise is already in the session.`);
      }
      if (seen.has(key)) errors.push(`${where}: repeats another option.`);
      if (!result.muscles.some((m) => slot.muscles.includes(m))) {
        errors.push(`${where}: must train one of ${slot.muscles.join(", ")} (same muscle group).`);
      }
      if (slot.isFinisher && !result.isAbs) errors.push(`${where}: the finisher needs an abs/core exercise.`);
      if (!errors.length) {
        seen.add(key);
        valid.push({ ...option, exercise: result.item });
      }
    }
    allErrors.push(...errors);
  });

  if (valid.length) return { value: valid.slice(0, count), errors: [] };
  return { value: [], errors: (allErrors.length ? allErrors : ["Return at least one option."]).slice(0, LIMITS.maxErrors) };
}
