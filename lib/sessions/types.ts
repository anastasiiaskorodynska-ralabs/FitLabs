import type { DayType } from "@/lib/day-types";

export type Measure = "reps" | "seconds";
export type BlockKind = "single" | "superset" | "circuit";
export type BlockRole = "warmup" | "main" | "finisher";
export type SessionStatus = "planned" | "done" | "skipped";

export type SetRow = {
  id: string;
  kg: number | null; // null = bodyweight
  reps: number | null;
  max: boolean;
  seconds: number | null;
};

export type SessionExercise = {
  id: string; // block_exercises.id
  exerciseId: string;
  measure: Measure;
  perSide: boolean;
  sets: SetRow[];
};

export type Block = {
  id: string;
  kind: BlockKind;
  role: BlockRole;
  rounds: number | null;
  restSec: number | null;
  exercises: SessionExercise[];
};

export type Session = {
  id: string;
  date: string; // YYYY-MM-DD
  dayType: DayType;
  status: SessionStatus;
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
