import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isExerciseAllowed, type EquipmentRef } from "@/lib/exercises/allowed";
import type { Block, LibraryExercise, Session } from "./types";

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

type SetDb = {
  id: string;
  position: number;
  target_kg: string | number | null;
  target_reps: number | null;
  target_reps_max: boolean;
  target_seconds: number | null;
};

type BlockDb = {
  id: string;
  position: number;
  kind: Block["kind"];
  role: Block["role"];
  rounds: number | null;
  rest_sec: number | null;
  block_exercises: {
    id: string;
    position: number;
    exercise_id: string;
    measure: "reps" | "seconds";
    per_side: boolean;
    sets: SetDb[];
  }[];
};

export function toBlocks(rows: BlockDb[]): Block[] {
  return [...rows].sort(byPosition).map((b) => ({
    id: b.id,
    kind: b.kind,
    role: b.role,
    rounds: b.rounds,
    restSec: b.rest_sec,
    exercises: [...b.block_exercises].sort(byPosition).map((e) => ({
      id: e.id,
      exerciseId: e.exercise_id,
      measure: e.measure,
      perSide: e.per_side,
      sets: [...e.sets].sort(byPosition).map((s) => ({
        id: s.id,
        kg: s.target_kg === null ? null : Number(s.target_kg),
        reps: s.target_reps,
        max: s.target_reps_max,
        seconds: s.target_seconds,
      })),
    })),
  }));
}

export const BLOCKS_SELECT =
  "id, position, kind, role, rounds, rest_sec, block_exercises(id, position, exercise_id, measure, per_side, sets(id, position, target_kg, target_reps, target_reps_max, target_seconds))";

export async function loadSession(supabase: SupabaseClient, id: string): Promise<Session | null> {
  const { data } = await supabase
    .from("sessions")
    .select(`id, date, day_type, status, blocks(${BLOCKS_SELECT})`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    date: data.date,
    dayType: data.day_type,
    status: data.status,
    blocks: toBlocks(data.blocks as BlockDb[]),
  };
}

// The exercise library with an `allowed` flag: all required equipment is
// available and the name doesn't match an avoid term.
export async function loadLibrary(supabase: SupabaseClient, locale: string): Promise<LibraryExercise[]> {
  const [{ data: exercises }, { data: rules }] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "id, name_en, name_uk, muscle_groups, day_types, default_measure, per_side, is_bodyweight, is_abs, technique_en, technique_uk, image_urls, video_url, exercise_equipment(equipment(name_en, name_uk, available, is_cardio_machine))",
      )
      .order("name_en"),
    supabase.from("training_rules").select("avoid_terms, avoid_cardio_machines").eq("id", 1).single(),
  ]);

  const avoidRules = {
    avoidTerms: rules?.avoid_terms ?? [],
    avoidCardioMachines: rules?.avoid_cardio_machines ?? false,
  };
  const uk = locale === "uk";

  return (exercises ?? []).map((e) => {
    const equipment = (e.exercise_equipment as unknown as { equipment: EquipmentRef }[]).map((x) => x.equipment);
    const technique = (uk ? e.technique_uk : e.technique_en) ?? "";

    return {
      id: e.id,
      name: uk ? e.name_uk : e.name_en,
      nameEn: e.name_en,
      muscles: e.muscle_groups,
      equipment: equipment.map((q) => ({ name: uk ? q.name_uk : q.name_en, available: q.available })),
      allowed: isExerciseAllowed(e, equipment, avoidRules),
      dayTypes: e.day_types,
      measure: e.default_measure,
      perSide: e.per_side,
      isBodyweight: e.is_bodyweight,
      isAbs: e.is_abs,
      technique: technique.split("\n").map((s: string) => s.trim()).filter(Boolean),
      images: e.image_urls,
      videoUrl: e.video_url,
    };
  });
}
