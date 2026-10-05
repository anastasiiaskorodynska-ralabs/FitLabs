import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { blockLabels, formatKg, setMode, weekStart } from "@/lib/sessions/format";
import { loadSession } from "@/lib/sessions/data";
import type { Block, Session, SessionExercise } from "@/lib/sessions/types";
import { GenerationError } from "./client";
import { loadGenerationContext, type GenerationContext } from "./context";

export class NotEditableError extends Error {}

// Loads a planned session plus the AI context for its date.
export async function loadSessionForAi(
  supabase: SupabaseClient,
  sessionId: string,
  today: string,
): Promise<{ session: Session; ctx: GenerationContext }> {
  const session = await loadSession(supabase, sessionId);
  if (!session) throw new GenerationError("failed", "session not found");
  if (session.status !== "planned") throw new NotEditableError("session is not planned");
  const ctx = await loadGenerationContext(supabase, weekStart(session.date), today, {
    date: session.date,
    dayType: session.dayType,
  });
  return { session, ctx };
}

function describeSets(item: SessionExercise) {
  return item.sets
    .map((s) => {
      const mode = setMode(item.measure, item.perSide, s);
      const amount = mode === "max" ? "max" : mode === "time" ? `${s.seconds}s` : `${s.reps}${mode === "side" ? "/side" : ""}`;
      return `${amount}@${s.kg === null ? "BW" : `${formatKg(s.kg)}kg`}`;
    })
    .join(", ");
}

// Plain-text session for the prompt; `marker` flags the exercise to replace.
export function describeBlocks(blocks: Block[], nameById: Map<string, string>, marker?: string) {
  const labels = blockLabels(blocks);
  return blocks.map((b, bi) => {
    const label = labels[bi];
    const head =
      b.role === "finisher"
        ? `Block ${bi + 1}: abs finisher (${b.kind}${b.rounds ? `, ${b.rounds} rounds` : ""}, rest ${b.restSec ?? 0}s)`
        : `Block ${bi + 1}: ${b.kind}${b.rounds ? `, ${b.rounds} rounds` : ""}, rest ${b.restSec ?? 0}s`;
    const items = b.exercises.map((e, ei) => {
      const tag = label.letter ? `${label.letter}${ei + 1} ` : "";
      const flag = e.id === marker ? "  <- REPLACE THIS" : "";
      return `  - ${tag}${nameById.get(e.exerciseId) ?? "?"}: ${describeSets(e)}${flag}`;
    });
    return [head, ...items].join("\n");
  });
}
