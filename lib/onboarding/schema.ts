import { z } from "zod";

// Error messages are keys under Onboarding.errors in messages/*.json.

export const SEXES = ["female", "male", "other"] as const;
export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const GOALS = ["strength", "muscle", "fat", "general"] as const;
export const DAY_TYPES = ["lower", "upper", "func", "full"] as const;
export const SESSION_LENGTHS = [30, 45, 60, 75, 90] as const;

export const LIMITS = {
  age: { min: 14, max: 99 },
  height: { min: 120, max: 230 },
  weight: { min: 30, max: 250 },
} as const;

const range = (key: keyof typeof LIMITS) =>
  z.number("number").int("number").min(LIMITS[key].min, "range").max(LIMITS[key].max, "range");

export const aboutSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(50, "tooLong"),
  sex: z.enum(SEXES, "pickOne"),
  age: range("age"),
  height: range("height"),
  weight: range("weight"),
  level: z.enum(LEVELS, "pickOne"),
});

export const goalSchema = z.object({
  goal: z.enum(GOALS, "pickOne"),
});

export const scheduleSchema = z.object({
  days: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), dayType: z.enum(DAY_TYPES) }))
    .min(1, "pickDay")
    .refine((days) => new Set(days.map((d) => d.weekday)).size === days.length, "invalid"),
  sessionLength: z.union(SESSION_LENGTHS.map((n) => z.literal(n)), "pickOne"),
});

export const rulesSchema = z.object({
  noWarmup: z.boolean(),
  absFinisher: z.boolean(),
  avoid: z.array(z.string().trim().min(1).max(60, "tooLong")).max(30, "tooMany"),
  notes: z.string().max(1000, "tooLong"),
});

export const equipmentSchema = z.object({
  equipmentIds: z.array(z.uuid()),
  custom: z.array(z.string().trim().min(1).max(40, "tooLong")).max(20, "tooMany"),
});

export const examplesSchema = z.object({
  example: z.string().max(20000, "tooLong"),
});

export const STEPS = [
  { key: "about", schema: aboutSchema },
  { key: "goal", schema: goalSchema },
  { key: "schedule", schema: scheduleSchema },
  { key: "rules", schema: rulesSchema },
  { key: "equipment", schema: equipmentSchema },
  { key: "examples", schema: examplesSchema },
] as const;

export const onboardingSchema = aboutSchema
  .extend(goalSchema.shape)
  .extend(scheduleSchema.shape)
  .extend(rulesSchema.shape)
  .extend(equipmentSchema.shape)
  .extend(examplesSchema.shape);

export type OnboardingData = z.infer<typeof onboardingSchema>;

// Form state: fields may be empty until the user picks them.
export type OnboardingDraft = Omit<OnboardingData, "sex" | "goal"> & {
  sex: OnboardingData["sex"] | null;
  goal: OnboardingData["goal"] | null;
};

export type FieldErrors = Partial<Record<string, string>>;

export function stepErrors(index: number, draft: OnboardingDraft): FieldErrors | null {
  const result = STEPS[index].schema.safeParse(draft);
  if (result.success) return null;
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return errors;
}
