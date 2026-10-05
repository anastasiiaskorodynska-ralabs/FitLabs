"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { DAY_TYPES } from "@/lib/onboarding/schema";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: "invalid" | "saveFailed" };

const uuid = z.uuid();

function fail(error: unknown): ActionResult<never> {
  console.error("session action failed", error);
  return { ok: false, error: "saveFailed" };
}

function refresh() {
  revalidatePath("/session/[id]", "page");
  revalidatePath("/week");
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc(fn, args);
  if (error) return fail(error);
  refresh();
  return { ok: true, data: undefined };
}

const createSchema = z.object({
  date: z.iso.date(),
  dayType: z.enum(DAY_TYPES),
});

export async function createManualSession(input: unknown): Promise<ActionResult<string>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_manual_session", {
    p_date: parsed.data.date,
    p_day_type: parsed.data.dayType,
  });
  if (error) return fail(error);
  revalidatePath("/week");
  return { ok: true, data: data as string };
}

const addSchema = z.object({
  sessionId: uuid,
  exerciseId: uuid,
  blockId: uuid.nullable(),
  kind: z.enum(["single", "superset", "circuit"]),
  role: z.enum(["main", "finisher"]),
});

export async function addExercise(input: unknown) {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" } as const;
  const d = parsed.data;
  return rpc("add_exercise", {
    p_session_id: d.sessionId,
    p_exercise_id: d.exerciseId,
    p_block_id: d.blockId,
    p_kind: d.kind,
    p_role: d.role,
  });
}

export async function moveExercise(id: unknown, dir: unknown) {
  const parsedId = uuid.safeParse(id);
  const parsedDir = z.union([z.literal(-1), z.literal(1)]).safeParse(dir);
  if (!parsedId.success || !parsedDir.success) return { ok: false, error: "invalid" } as const;
  return rpc("move_block_exercise", { p_id: parsedId.data, p_dir: parsedDir.data });
}

export async function deleteExercise(id: unknown) {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "invalid" } as const;
  return rpc("delete_block_exercise", { p_id: parsed.data });
}

export async function swapExercise(id: unknown, exerciseId: unknown) {
  const a = uuid.safeParse(id);
  const b = uuid.safeParse(exerciseId);
  if (!a.success || !b.success) return { ok: false, error: "invalid" } as const;
  return rpc("swap_exercise", { p_id: a.data, p_exercise_id: b.data });
}

const setSchema = z
  .object({
    id: uuid,
    kg: z.number().min(0).max(999).nullable(),
    reps: z.number().int().min(1).max(999).nullable(),
    max: z.boolean(),
    seconds: z.number().int().min(1).max(3600).nullable(),
  })
  .refine((s) => !(s.max && s.reps !== null))
  .refine((s) => !(s.seconds !== null && (s.reps !== null || s.max)));

const saveSetsSchema = z.object({
  measure: z.enum(["reps", "seconds"]),
  perSide: z.boolean(),
  sets: z.array(setSchema).min(1).max(20),
});

export async function saveSets(id: unknown, input: unknown) {
  const parsedId = uuid.safeParse(id);
  const parsed = saveSetsSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: "invalid" } as const;
  return rpc("save_exercise_sets", {
    p_id: parsedId.data,
    p_measure: parsed.data.measure,
    p_per_side: parsed.data.perSide,
    p_sets: parsed.data.sets,
  });
}

export async function addSet(blockExerciseId: unknown) {
  const parsed = uuid.safeParse(blockExerciseId);
  if (!parsed.success) return { ok: false, error: "invalid" } as const;
  return rpc("add_set", { p_block_exercise_id: parsed.data });
}

export async function deleteSet(setId: unknown): Promise<ActionResult> {
  const parsed = uuid.safeParse(setId);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase } = await requireUser();

  // Keep at least one set per exercise.
  const { data: set } = await supabase.from("sets").select("block_exercise_id").eq("id", parsed.data).single();
  if (!set) return { ok: false, error: "invalid" };
  const { count } = await supabase
    .from("sets")
    .select("id", { count: "exact", head: true })
    .eq("block_exercise_id", set.block_exercise_id);
  if ((count ?? 0) <= 1) return { ok: false, error: "invalid" };

  const { error } = await supabase.from("sets").delete().eq("id", parsed.data);
  if (error) return fail(error);
  refresh();
  return { ok: true, data: undefined };
}

const blockSchema = z.object({
  rounds: z.number().int().min(1).max(20).nullable(),
  restSec: z.number().int().min(0).max(600),
});

export async function updateBlock(blockId: unknown, input: unknown): Promise<ActionResult> {
  const parsedId = uuid.safeParse(blockId);
  const parsed = blockSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: "invalid" };
  const { supabase } = await requireUser();

  const { data: block } = await supabase.from("blocks").select("kind").eq("id", parsedId.data).single();
  if (!block) return { ok: false, error: "invalid" };

  const { error } = await supabase
    .from("blocks")
    .update({
      rest_sec: parsed.data.restSec,
      ...(block.kind === "circuit" && parsed.data.rounds ? { rounds: parsed.data.rounds } : {}),
    })
    .eq("id", parsedId.data);
  if (error) return fail(error);
  refresh();
  return { ok: true, data: undefined };
}
