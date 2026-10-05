import type { DayType } from "@/lib/day-types";

export type Measure = "reps" | "seconds";
export type BlockKind = "single" | "superset" | "circuit";
export type BlockRole = "warmup" | "main" | "finisher";
export type SessionStatus = "planned" | "done" | "skipped";

// Targets (kg, reps, max, seconds) are the plan; actual* is what was logged.
export type SetRow = {
  id: string;
  kg: number | null; // null = bodyweight
  reps: number | null;
  max: boolean;
  seconds: number | null;
  actualKg: number | null;
  actualReps: number | null;
  actualSeconds: number | null;
  completed: boolean | null; // null = never logged
};

export type SessionExercise = {
  id: string; // block_exercises.id
  exerciseId: string;
  measure: Measure;
  perSide: boolean;
  notes: string | null;
  sets: SetRow[];
};

export type Block = {
  id: string;
  kind: BlockKind;
  role: BlockRole;
  rounds: number | null;
  actualRounds: number | null;
  restSec: number | null;
  exercises: SessionExercise[];
};

export type Session = {
  id: string;
  date: string; // YYYY-MM-DD
  dayType: DayType;
  status: SessionStatus;
  notes: string | null;
  loggedAt: string | null;
  blocks: Block[];
};

export type LibraryExercise = {
  id: string;
  name: string;
  nameEn: string;
  muscles: string[];
  equipment: { name: string; available: boolean }[];
  allowed: boolean;
  dayTypes: DayType[];
  measure: Measure;
  perSide: boolean;
  isBodyweight: boolean;
  isAbs: boolean;
  technique: string[];
  images: string[];
  videoUrl: string | null;
};
