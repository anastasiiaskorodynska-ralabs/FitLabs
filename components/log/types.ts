import type { LogSet } from "@/lib/log/schema";
import type { SessionExercise, SetRow } from "@/lib/sessions/types";

export type LogRow = LogSet;

// Pre-fill: what was logged before, otherwise the plan ("max" reps stay empty).
export function initialRow(set: SetRow): LogRow {
  if (set.completed !== null) {
    return { id: set.id, done: set.completed, kg: set.actualKg, reps: set.actualReps, seconds: set.actualSeconds };
  }
  return { id: set.id, done: false, kg: set.kg, reps: set.max ? null : set.reps, seconds: set.seconds };
}

// The planned values as a row, used by "as planned" and "Reset to plan".
export const plannedRow = (set: SetRow, done: boolean): LogRow => ({
  id: set.id,
  done,
  kg: set.kg,
  reps: set.max ? null : set.reps,
  seconds: set.seconds,
});

export const needsAmount = (item: SessionExercise, row: LogRow) =>
  item.measure === "seconds" ? row.seconds === null : row.reps === null;

// +1 above plan, -1 below, 0 same (kg first, then reps/seconds).
export function versusPlan(item: SessionExercise, set: SetRow, row: LogRow) {
  const sign = (a: number | null, b: number | null) => (a === null || b === null ? 0 : Math.sign(a - b));
  const kg = sign(row.kg, set.kg);
  const amount = item.measure === "seconds" ? sign(row.seconds, set.seconds) : set.max ? 0 : sign(row.reps, set.reps);
  return { kg, amount, overall: kg || amount };
}
