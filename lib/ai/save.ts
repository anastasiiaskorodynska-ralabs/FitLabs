import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WEEK_MODEL } from "./client";
import { PROMPT_VERSION } from "./prompts";
import type { AiWeekPlan } from "./schemas";

// Saves a checked plan through save_generated_week() (one transaction).
// The JSON keeps the AI schema's snake_case field names.
export async function saveWeekPlan(supabase: SupabaseClient, weekStart: string, plan: AiWeekPlan) {
  const sessions = plan.sessions.map((s) => ({
    date: s.date,
    day_type: s.day_type,
    title: s.title,
    blocks: s.blocks.map((b) => ({
      kind: b.kind,
      role: b.role,
      rounds: b.rounds,
      rest_sec: b.rest_sec,
      exercises: b.exercises.map((e) => ({
        exercise_id: e.exercise_id,
        new_exercise: e.new_exercise && {
          ...e.new_exercise,
          day_types: e.new_exercise.day_types.length ? e.new_exercise.day_types : [s.day_type],
        },
        measure: e.measure,
        per_side: e.per_side,
        technique_note: e.technique_note,
        sets: e.sets,
      })),
    })),
  }));

  const { data, error } = await supabase.rpc("save_generated_week", {
    p_week_start: weekStart,
    p_model: WEEK_MODEL,
    p_prompt_version: PROMPT_VERSION,
    p_sessions: sessions,
  });
  if (error) throw error;
  return data as number;
}
