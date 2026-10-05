"use server";

import { revalidatePath } from "next/cache";
import { checkExerciseOptions } from "@/lib/ai/rules";
import { saveExercise } from "@/lib/ai/save";
import { applyOptionRequestSchema } from "@/lib/ai/schemas";
import { NotEditableError, loadSessionForAi } from "@/lib/ai/session";
import { findSlot } from "@/lib/ai/slot";
import { requireUser } from "@/lib/auth";
import { todayIso } from "@/lib/today";

export type ApplyResult = { ok: true } | { ok: false; error: "invalid" | "notPlanned" | "saveFailed" };

// Saves a "Suggest with AI" option the user picked. The option comes from the
// browser, so it is checked against the rules again before saving.
export async function applyAiOption(input: unknown): Promise<ApplyResult> {
  const { supabase } = await requireUser();
  const parsed = applyOptionRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { blockExerciseId, exercise } = parsed.data;

  try {
    const { data: row } = await supabase.from("block_exercises").select("blocks(session_id)").eq("id", blockExerciseId).single();
    const sessionId = (row?.blocks as unknown as { session_id: string } | null)?.session_id;
    if (!sessionId) return { ok: false, error: "invalid" };

    const { session, ctx } = await loadSessionForAi(supabase, sessionId, await todayIso());
    const found = findSlot(session, ctx, blockExerciseId);
    if (!found) return { ok: false, error: "invalid" };

    const { value, errors } = checkExerciseOptions([{ why: "", exercise }], ctx, found.slot, 1);
    if (errors.length) return { ok: false, error: "invalid" };

    await saveExercise(supabase, blockExerciseId, value[0].exercise, session.dayType);
    revalidatePath(`/session/${session.id}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof NotEditableError) return { ok: false, error: "notPlanned" };
    console.error("applyAiOption failed", error);
    return { ok: false, error: "saveFailed" };
  }
}
