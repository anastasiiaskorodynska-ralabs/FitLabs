import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayType } from "@/lib/day-types";
import { addDays } from "@/lib/sessions/format";
import { BLOCKS_SELECT, toBlocks } from "@/lib/sessions/data";
import type { SessionStatus } from "@/lib/sessions/types";

const HISTORY_WEEKS = 26;

export type HistorySession = {
  id: string;
  date: string;
  dayType: DayType;
  status: SessionStatus;
  setsLogged: number;
  durationMin: number | null;
};

export type ProgressPoint = { date: string; kg: number; reps: number | null; sets: number };

export type ExerciseProgress = {
  exerciseId: string;
  name: string;
  dayType: DayType; // colours the chart (from the latest session)
  perSide: boolean;
  points: ProgressPoint[]; // oldest first
};

// Past sessions (newest first) and, per weighted exercise, the heaviest
// completed set of each logged session.
export async function loadHistory(supabase: SupabaseClient, today: string, locale: string) {
  const from = addDays(today, -HISTORY_WEEKS * 7);
  const [{ data: rows }, { data: exercises }] = await Promise.all([
    supabase
      .from("sessions")
      .select(`id, date, day_type, status, duration_min, blocks(${BLOCKS_SELECT})`)
      .gte("date", from)
      .or(`date.lte.${today},status.neq.planned`)
      .order("date", { ascending: false }),
    supabase.from("exercises").select("id, name_en, name_uk"),
  ]);

  const names = new Map((exercises ?? []).map((e) => [e.id, locale === "uk" ? e.name_uk : e.name_en]));
  const progress = new Map<string, ExerciseProgress>();

  const sessions: HistorySession[] = (rows ?? []).map((s) => {
    const blocks = toBlocks(s.blocks);
    let setsLogged = 0;
    for (const item of blocks.flatMap((b) => b.exercises)) {
      const done = item.sets.filter((set) => set.completed);
      setsLogged += done.length;
      if (s.status !== "done") continue;
      const weighted = done.filter((set) => set.actualKg !== null);
      if (!weighted.length) continue;
      const top = weighted.reduce((a, b) => (b.actualKg! > a.actualKg! ? b : a));
      const entry: ExerciseProgress = progress.get(item.exerciseId) ?? {
        exerciseId: item.exerciseId,
        name: names.get(item.exerciseId) ?? "?",
        dayType: s.day_type,
        perSide: item.perSide,
        points: [],
      };
      entry.points.unshift({ date: s.date, kg: top.actualKg!, reps: top.actualReps, sets: done.length });
      progress.set(item.exerciseId, entry);
    }
    return {
      id: s.id,
      date: s.date,
      dayType: s.day_type,
      status: s.status,
      setsLogged,
      durationMin: s.duration_min,
    };
  });

  // Most-logged exercises first.
  const exercisesProgress = [...progress.values()].sort((a, b) => b.points.length - a.points.length);
  return { sessions, progress: exercisesProgress };
}
