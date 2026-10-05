import { blockLabels, formatKg } from "@/lib/sessions/format";
import type { Session } from "@/lib/sessions/types";
import type { LogSessionInput } from "./schema";

type Labels = {
  superset: (letter: string) => string;
  circuit: (n: number) => string;
  finisher: string;
  rounds: (n: number) => string;
  perSide: string;
};

// A logged session as plain text for the Examples library ("Save as example"),
// in the same free-text style the user pastes. Only completed sets are included.
export function sessionToExampleText(
  session: Session,
  log: LogSessionInput,
  nameOf: (exerciseId: string) => string,
  labels: Labels,
) {
  const sets = new Map(log.sets.map((s) => [s.id, s]));
  const rounds = new Map(log.rounds.map((r) => [r.id, r.rounds]));
  const kinds = blockLabels(session.blocks);
  const lines: string[] = [];

  session.blocks.forEach((block, bi) => {
    const kind = kinds[bi];
    const items = block.exercises
      .map((item, ei) => {
        const done = item.sets.map((s) => sets.get(s.id)).filter((s) => s?.done);
        if (!done.length) return null;
        const values = done.map((s) => {
          const amount = item.measure === "seconds" ? `${s!.seconds ?? 0}s` : `${s!.reps ?? 0}${item.perSide ? `/${labels.perSide}` : ""}`;
          return s!.kg === null ? amount : `${formatKg(s!.kg)}kg×${amount}`;
        });
        // Collapse identical sets: "60kg×15 ×3".
        const text = values.every((v) => v === values[0]) && values.length > 1 ? `${values[0]} ×${values.length}` : values.join(", ");
        const tag = kind.letter ? `${kind.letter}${ei + 1} ` : "";
        return `${tag}${nameOf(item.exerciseId)}: ${text}`;
      })
      .filter((l): l is string => l !== null);
    if (!items.length) return;

    if (kind.kind === "single") {
      lines.push(...items);
      return;
    }
    const n = rounds.get(block.id) ?? block.rounds;
    const head =
      kind.kind === "finisher" ? labels.finisher : kind.kind === "superset" ? labels.superset(kind.letter!) : labels.circuit(kind.index!);
    lines.push(`${head}${block.kind === "circuit" && n ? ` (${labels.rounds(n)})` : ""}:`, ...items.map((l) => `  ${l}`));
  });

  if (log.notes.trim()) lines.push("", log.notes.trim());
  return lines.join("\n");
}
