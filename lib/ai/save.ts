import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayType } from "@/lib/day-types";
import { WEEK_MODEL } from "./client";
import { PROMPT_VERSION } from "./prompts";
import type { AiBlock, AiBlockExercise, AiSession, AiWeekPlan } from "./schemas";

// Checked AI output goes to the SQL functions in supabase/migrations (one
// transaction each). The JSON keeps the AI schema's snake_case field names.

const exerciseJson = (e: AiBlockExercise, dayType: DayType) => ({
  exercise_id: e.exercise_id,
  new_exercise: e.new_exercise && {
    ...e.new_exercise,
    day_types: e.new_exercise.day_types.length ? e.new_exercise.day_types : [dayType],
  },
  measure: e.measure,
  per_side: e.per_side,
  technique_note: e.technique_note,
  sets: e.sets,
});

const blocksJson = (blocks: AiBlock[], dayType: DayType) =>
  blocks.map((b) => ({
    kind: b.kind,
    role: b.role,
    rounds: b.rounds,
    rest_sec: b.rest_sec,
    exercises: b.exercises.map((e) => exerciseJson(e, dayType)),
  }));

export async function saveWeekPlan(supabase: SupabaseClient, weekStart: string, plan: AiWeekPlan) {
  const { data, error } = await supabase.rpc("save_generated_week", {
    p_week_start: weekStart,
    p_model: WEEK_MODEL,
    p_prompt_version: PROMPT_VERSION,
    p_sessions: plan.sessions.map((s) => ({
      date: s.date,
      day_type: s.day_type,
      title: s.title,
      blocks: blocksJson(s.blocks, s.day_type),
    })),
  });
  if (error) throw error;
  return data as number;
}

export async function saveDay(supabase: SupabaseClient, sessionId: string, session: AiSession) {
  const { error } = await supabase.rpc("replace_session_plan", {
    p_session_id: sessionId,
    p_title: session.title,
    p_blocks: blocksJson(session.blocks, session.day_type),
  });
  if (error) throw error;
}

export async function saveExercise(
  supabase: SupabaseClient,
  blockExerciseId: string,
  exercise: AiBlockExercise,
  dayType: DayType,
) {
  const { error } = await supabase.rpc("replace_block_exercise", {
    p_id: blockExerciseId,
    e: exerciseJson(exercise, dayType),
  });
  if (error) throw error;
}
