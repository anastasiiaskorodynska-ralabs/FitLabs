import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { toGenerationError } from "@/lib/ai/client";
import { generateExerciseOptions } from "@/lib/ai/generate";
import { saveExercise } from "@/lib/ai/save";
import { regenerateExerciseRequestSchema } from "@/lib/ai/schemas";
import { NotEditableError, describeBlocks, loadSessionForAi } from "@/lib/ai/session";
import { findSlot } from "@/lib/ai/slot";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";

export const maxDuration = 120;

const SUGGESTIONS = 3;
const STATUS = { noTargets: 409, refused: 422, invalid: 502, rateLimited: 429, unavailable: 503, failed: 500 } as const;

// replace: swaps the exercise in place for the best AI option.
// suggest: returns options for the swap sheet; picking one goes through applyAiOption().
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = regenerateExerciseRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });
  const { blockExerciseId, reason, mode } = body.data;

  try {
    const { data: row } = await supabase
      .from("block_exercises")
      .select("blocks(session_id)")
      .eq("id", blockExerciseId)
      .single();
    const sessionId = (row?.blocks as unknown as { session_id: string } | null)?.session_id;
    if (!sessionId) return NextResponse.json({ error: "badRequest" }, { status: 404 });

    const { session, ctx } = await loadSessionForAi(supabase, sessionId, await todayIso());
    const found = findSlot(session, ctx, blockExerciseId);
    if (!found) return NextResponse.json({ error: "badRequest" }, { status: 404 });

    const names = new Map(ctx.library.map((e) => [e.id, e.nameEn]));
    const options = await generateExerciseOptions(
      ctx,
      describeBlocks(session.blocks, names, blockExerciseId),
      { ...found.slot, name: found.name, where: found.where },
      mode === "replace" ? 1 : SUGGESTIONS,
      reason,
    );

    if (mode === "replace") {
      await saveExercise(supabase, blockExerciseId, options[0].exercise, session.dayType);
      revalidatePath(`/session/${session.id}`);
      return NextResponse.json({ ok: true });
    }

    // Display info for each option; the exercise itself is sent back on apply.
    const byId = new Map(ctx.library.map((e) => [e.id, e]));
    const uk = ctx.locale === "uk";
    return NextResponse.json({
      options: options.map((o) => {
        const entry = o.exercise.exercise_id ? byId.get(o.exercise.exercise_id) : undefined;
        const n = o.exercise.new_exercise;
        return {
          why: o.why,
          exerciseId: o.exercise.exercise_id,
          name: entry ? (uk ? entry.nameUk : entry.nameEn) : uk ? n?.name_uk : n?.name_en,
          muscles: entry?.muscles ?? n?.muscle_groups ?? [],
          isNew: !entry,
          exercise: o.exercise,
        };
      }),
    });
  } catch (error) {
    if (error instanceof NotEditableError) return NextResponse.json({ error: "notPlanned" }, { status: 409 });
    const err = toGenerationError(error);
    console.error("regenerate-exercise failed", err.code, err.message);
    return NextResponse.json({ error: err.code }, { status: STATUS[err.code] });
  }
}
