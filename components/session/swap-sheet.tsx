"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { swapExercise } from "@/app/session/actions";
import { BottomSheet } from "@/components/bottom-sheet";
import { FieldError } from "@/components/onboarding/controls";
import type { LibraryExercise, SessionExercise } from "@/lib/sessions/types";
import { ExercisePicker } from "./exercise-picker";

// Manual swap: same muscles first, then same reps/seconds style.
export function SwapSheet({
  item,
  current,
  library,
  onClose,
}: {
  item: SessionExercise;
  current: LibraryExercise | undefined;
  library: LibraryExercise[];
  onClose: () => void;
}) {
  const t = useTranslations("Session");
  const tErr = useTranslations("Session.errors");
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const rank = (e: LibraryExercise) => {
    if (!current) return 0;
    const shared = e.muscles.filter((m) => current.muscles.includes(m)).length;
    return shared * 2 + (e.measure === current.measure ? 1 : 0) + (e.isAbs === current.isAbs ? 1 : 0);
  };

  const pick = (e: LibraryExercise) => {
    setError(undefined);
    startSaving(async () => {
      const result = await swapExercise(item.id, e.id);
      if (result.ok) onClose();
      else setError(tErr(result.error));
    });
  };

  return (
    <BottomSheet
      open
      tall
      onClose={onClose}
      eyebrow={t("swap")}
      title={current?.name ?? t("unknownExercise")}
    >
      <FieldError message={error} />
      <ExercisePicker library={library} excludeId={item.exerciseId} rank={rank} onPick={pick} disabled={saving} />
    </BottomSheet>
  );
}
