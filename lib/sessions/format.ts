import type { Block, Measure, SetRow } from "./types";

export type SetMode = "reps" | "max" | "side" | "time";

export const KG_STEP = 2.5;

export function setMode(measure: Measure, perSide: boolean, set: SetRow): SetMode {
  if (measure === "seconds") return "time";
  if (set.max) return "max";
  return perSide ? "side" : "reps";
}

export const formatKg = (kg: number) => (Number.isInteger(kg) ? String(kg) : kg.toFixed(1));

// Rough length: ~40 s of work per set plus rest, rounded to 5 minutes.
export function estimateMinutes(blocks: Block[]) {
  let seconds = 0;
  for (const b of blocks) {
    const rest = b.restSec ?? 60;
    if (b.kind === "circuit") {
      seconds += (b.rounds ?? 1) * (b.exercises.length * 45 + rest);
    } else {
      const sets = Math.max(0, ...b.exercises.map((e) => e.sets.length));
      seconds += sets * (b.exercises.length * 40 + rest);
    }
  }
  return Math.max(5, Math.round(seconds / 300) * 5);
}

export const exerciseCount = (blocks: Block[]) =>
  blocks.reduce((n, b) => n + b.exercises.length, 0);

// Labels: "Superset A", "Circuit 1"; superset exercises are tagged A1, A2.
export function blockLabels(blocks: Block[]) {
  let superset = 0;
  let circuit = 0;
  return blocks.map((b) => {
    if (b.role === "finisher") return { kind: "finisher" as const, letter: null, index: null };
    if (b.kind === "superset") {
      const letter = String.fromCharCode(65 + superset++);
      return { kind: "superset" as const, letter, index: null };
    }
    if (b.kind === "circuit") return { kind: "circuit" as const, letter: null, index: ++circuit };
    return { kind: "single" as const, letter: null, index: null };
  });
}

// Monday (YYYY-MM-DD) of the week containing an ISO date.
export function weekStart(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const weekdayOf = (isoDate: string) => (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;
