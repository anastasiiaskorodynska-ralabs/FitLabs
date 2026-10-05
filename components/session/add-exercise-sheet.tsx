"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addExercise } from "@/app/session/actions";
import { BottomSheet } from "@/components/bottom-sheet";
import { FieldError } from "@/components/onboarding/controls";
import type { DayType } from "@/lib/day-types";
import type { Block, LibraryExercise } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";
import { ExercisePicker } from "./exercise-picker";

type Target =
  | { key: string; kind: "single" | "superset" | "circuit"; role: "main" | "finisher"; blockId: null }
  | { key: string; blockId: string; finisher: boolean };

export function AddExerciseSheet({
  sessionId,
  dayType,
  blocks,
  labels,
  library,
  onClose,
}: {
  sessionId: string;
  dayType: DayType;
  blocks: Block[];
  labels: string[]; // display label per block, same order
  library: LibraryExercise[];
  onClose: () => void;
}) {
  const t = useTranslations("Session.add");
  const tErr = useTranslations("Session.errors");
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const hasFinisher = blocks.some((b) => b.role === "finisher");
  const targets: (Target & { label: string })[] = [
    { key: "single", kind: "single", role: "main", blockId: null, label: t("single") },
    { key: "superset", kind: "superset", role: "main", blockId: null, label: t("newSuperset") },
    { key: "circuit", kind: "circuit", role: "main", blockId: null, label: t("newCircuit") },
    ...(hasFinisher
      ? []
      : [{ key: "finisher", kind: "circuit" as const, role: "finisher" as const, blockId: null, label: t("newFinisher") }]),
    ...blocks.flatMap((b, i) =>
      b.kind === "single" && b.role !== "finisher"
        ? []
        : [{ key: b.id, blockId: b.id, finisher: b.role === "finisher", label: t("addTo", { block: labels[i] }) }],
    ),
  ];
  const [targetKey, setTargetKey] = useState(targets[0].key);
  const target = targets.find((x) => x.key === targetKey) ?? targets[0];
  const forFinisher = "finisher" in target ? target.finisher : target.role === "finisher";

  // Abs first for finishers; otherwise exercises that fit today's focus.
  const rank = (e: LibraryExercise) =>
    forFinisher ? (e.isAbs ? 2 : 0) : (e.dayTypes.includes(dayType) ? 2 : 0) - (e.isAbs ? 1 : 0);

  const pick = (e: LibraryExercise) => {
    setError(undefined);
    startSaving(async () => {
      const result = await addExercise({
        sessionId,
        exerciseId: e.id,
        blockId: target.blockId,
        kind: "kind" in target ? target.kind : "single",
        role: "role" in target ? target.role : "main",
      });
      if (result.ok) onClose();
      else setError(tErr(result.error));
    });
  };

  return (
    <BottomSheet open tall onClose={onClose} eyebrow={t("eyebrow")} title={t("title")}>
      <div className="flex flex-none flex-col gap-2">
        <span className="text-[15px] font-semibold text-text-2">{t("where")}</span>
        <div role="radiogroup" aria-label={t("where")} className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {targets.map((x) => (
            <button
              key={x.key}
              type="button"
              role="radio"
              aria-checked={x.key === targetKey}
              onClick={() => setTargetKey(x.key)}
              className={cn(
                "min-h-11 flex-none rounded-full border-[1.5px] px-4 text-[15px] font-semibold",
                x.key === targetKey ? "border-text bg-text text-bg" : "border-line-strong text-text",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <FieldError message={error} />
      <ExercisePicker library={library} rank={rank} onPick={pick} disabled={saving} />
    </BottomSheet>
  );
}
