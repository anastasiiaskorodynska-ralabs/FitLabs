import "server-only";
import type { Session } from "@/lib/sessions/types";
import type { GenerationContext } from "./context";
import type { ExerciseSlot } from "./rules";

// Where one block exercise sits, and what a replacement must respect.
export function findSlot(session: Session, ctx: GenerationContext, blockExerciseId: string) {
  for (const [bi, block] of session.blocks.entries()) {
    const ei = block.exercises.findIndex((e) => e.id === blockExerciseId);
    if (ei === -1) continue;
    const item = block.exercises[ei];
    const entry = ctx.library.find((e) => e.id === item.exerciseId);
    const slot: ExerciseSlot = {
      blockKind: block.kind,
      isFinisher: block.role === "finisher",
      muscles: entry?.muscles ?? [],
      excludeIds: session.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId)),
    };
    return {
      item,
      slot,
      name: entry?.nameEn ?? "exercise",
      where: `block ${bi + 1}, ${block.role === "finisher" ? "abs finisher" : block.kind}, exercise ${ei + 1}`,
    };
  }
  return null;
}
