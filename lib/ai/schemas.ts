import { z } from "zod";
import { MUSCLES } from "@/lib/exercises/muscles";
import { DAY_TYPES } from "@/lib/onboarding/schema";

// JSON the model must return. Kept free of numeric/length constraints so it
// works as a structured-output schema; ranges and training rules are checked
// in code (lib/ai/rules.ts), which also produces the errors sent on retry.

export const aiSetSchema = z.object({
  kg: z.number().nullable().describe("Target weight in kg; null = bodyweight"),
  reps: z.number().int().nullable().describe("Target reps; null when max is true or the exercise is timed"),
  max: z.boolean().describe('true = "as many reps as possible"'),
  seconds: z.number().int().nullable().describe("Target seconds for timed exercises, else null"),
});

export const aiNewExerciseSchema = z.object({
  name_en: z.string(),
  name_uk: z.string(),
  muscle_groups: z.array(z.enum(MUSCLES)),
  day_types: z.array(z.enum(DAY_TYPES)),
  equipment_slugs: z.array(z.string()).describe("Slugs from AVAILABLE EQUIPMENT; empty = bodyweight"),
  default_measure: z.enum(["reps", "seconds"]),
  per_side: z.boolean(),
  is_bodyweight: z.boolean(),
  is_abs: z.boolean(),
  technique_en: z.string().describe("3 short steps separated by newlines"),
  technique_uk: z.string().describe("The same steps in Ukrainian"),
});

export const aiBlockExerciseSchema = z.object({
  exercise_id: z.string().nullable().describe("id from EXERCISE LIBRARY, or null for a new exercise"),
  new_exercise: aiNewExerciseSchema.nullable().describe("Only when exercise_id is null"),
  measure: z.enum(["reps", "seconds"]),
  per_side: z.boolean(),
  technique_note: z.string().nullable().describe("Short how-to in the app language, or null"),
  sets: z.array(aiSetSchema).describe("One entry per set; a circuit exercise has exactly one (the target per round)"),
});

export const aiBlockSchema = z.object({
  kind: z.enum(["single", "superset", "circuit"]),
  role: z.enum(["warmup", "main", "finisher"]),
  rounds: z.number().int().nullable().describe("Circuits only; null otherwise"),
  rest_sec: z.number().int(),
  exercises: z.array(aiBlockExerciseSchema),
});

export const aiSessionSchema = z.object({
  date: z.string().describe("YYYY-MM-DD"),
  day_type: z.enum(DAY_TYPES),
  title: z.string().nullable(),
  blocks: z.array(aiBlockSchema),
});

export const aiWeekPlanSchema = z.object({
  sessions: z.array(aiSessionSchema),
});

export const aiExerciseOptionsSchema = z.object({
  options: z.array(
    z.object({
      why: z.string().describe("One short sentence: why this fits"),
      exercise: aiBlockExerciseSchema,
    }),
  ),
});

export type AiSet = z.infer<typeof aiSetSchema>;
export type AiNewExercise = z.infer<typeof aiNewExerciseSchema>;
export type AiBlockExercise = z.infer<typeof aiBlockExerciseSchema>;
export type AiBlock = z.infer<typeof aiBlockSchema>;
export type AiSession = z.infer<typeof aiSessionSchema>;
export type AiWeekPlan = z.infer<typeof aiWeekPlanSchema>;

export type AiExerciseOption = z.infer<typeof aiExerciseOptionsSchema>["options"][number];

export const generateWeekRequestSchema = z.object({
  weekStart: z.iso.date(),
});

const reasonSchema = z.string().trim().max(200).optional();

export const regenerateDayRequestSchema = z.object({
  sessionId: z.uuid(),
  reason: reasonSchema,
});

export const regenerateExerciseRequestSchema = z.object({
  blockExerciseId: z.uuid(),
  reason: reasonSchema,
  // replace: swap it in place now; suggest: return options for the swap sheet.
  mode: z.enum(["replace", "suggest"]),
});

// A suggestion the user picked in the swap sheet (re-checked before saving).
export const applyOptionRequestSchema = z.object({
  blockExerciseId: z.uuid(),
  exercise: aiBlockExerciseSchema,
});
