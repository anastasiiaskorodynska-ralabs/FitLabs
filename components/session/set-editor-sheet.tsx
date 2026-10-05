"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Minus, Plus } from "lucide-react";
import { deleteSet, saveSets } from "@/app/session/actions";
import { BottomSheet, PrimaryButton } from "@/components/bottom-sheet";
import { FieldError } from "@/components/onboarding/controls";
import { KG_STEP, formatKg, setMode, type SetMode } from "@/lib/sessions/format";
import type { Measure, SessionExercise, SetRow } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";

const MODES: SetMode[] = ["reps", "max", "side", "time"];

type Draft = { measure: Measure; perSide: boolean; sets: SetRow[] };

function applyMode(draft: Draft, mode: SetMode, targets: number[]): Draft {
  // Seconds and per-side belong to the exercise; "max" is per set.
  const measure: Measure = mode === "time" ? "seconds" : "reps";
  const perSide = mode === "side" ? true : mode === "time" || mode === "reps" ? false : draft.perSide;
  const sets = draft.sets.map((s, i) => {
    if (measure === "seconds") return { ...s, reps: null, max: false, seconds: s.seconds ?? 30 };
    const base = { ...s, seconds: null, reps: s.reps ?? 10 };
    if (!targets.includes(i)) return draft.measure === "seconds" ? { ...base, max: false } : s;
    return mode === "max" ? { ...base, reps: null, max: true } : { ...base, max: false };
  });
  return { measure, perSide, sets };
}

function Stepper({
  label,
  hint,
  value,
  unit,
  onDown,
  onUp,
  dimmed,
  downLabel,
  upLabel,
}: {
  label: string;
  hint?: string;
  value: string;
  unit: string;
  onDown: () => void;
  onUp: () => void;
  dimmed?: boolean;
  downLabel: string;
  upLabel: string;
}) {
  const button =
    "flex size-16 flex-none items-center justify-center rounded-[18px] bg-surface-3 text-text active:scale-[.94] disabled:opacity-50";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[15px] font-semibold text-text-2">
        <span>{label}</span>
        {hint && <span className="font-medium text-text-3">{hint}</span>}
      </div>
      <div className={cn("flex items-center gap-2 rounded-3xl bg-surface-2 p-2", dimmed && "opacity-45")}>
        <button type="button" aria-label={downLabel} onClick={onDown} disabled={dimmed} className={button}>
          <Minus className="size-7" />
        </button>
        <div aria-live="polite" className="flex flex-1 items-baseline justify-center gap-1.5">
          <span className="text-[52px] leading-none font-extrabold tracking-[-0.02em]">{value}</span>
          <span className="text-[17px] font-semibold text-text-2">{unit}</span>
        </div>
        <button type="button" aria-label={upLabel} onClick={onUp} disabled={dimmed} className={button}>
          <Plus className="size-7" />
        </button>
      </div>
    </div>
  );
}

export function SetEditorSheet({
  exercise,
  name,
  setIndex,
  perRound,
  onClose,
}: {
  exercise: SessionExercise;
  name: string;
  setIndex: number;
  perRound: boolean; // circuit target: one value per round, no "apply to all"
  onClose: () => void;
}) {
  const t = useTranslations("Session.editor");
  const tErr = useTranslations("Session.errors");
  const [draft, setDraft] = useState<Draft>({
    measure: exercise.measure,
    perSide: exercise.perSide,
    sets: exercise.sets,
  });
  const [applyAll, setApplyAll] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const set = draft.sets[setIndex];
  const mode = setMode(draft.measure, draft.perSide, set);
  const targets = applyAll ? draft.sets.map((_, i) => i) : [setIndex];

  // Copies one set's values onto every set, keeping each set's own id.
  const copyToAll = (d: Draft, source: SetRow): Draft => ({
    ...d,
    sets: d.sets.map((s) => ({ ...source, id: s.id })),
  });

  // Edits the open set; with "apply to all" every set gets the same result.
  const change = (fn: (s: SetRow) => SetRow) =>
    setDraft((d) => {
      const next = fn(d.sets[setIndex]);
      return applyAll
        ? copyToAll(d, next)
        : { ...d, sets: d.sets.map((s, i) => (i === setIndex ? next : s)) };
    });

  const toggleApplyAll = () => {
    if (!applyAll) setDraft((d) => copyToAll(d, d.sets[setIndex]));
    setApplyAll((v) => !v);
  };

  const kgDown = () => change((s) => ({ ...s, kg: s.kg === null || s.kg <= KG_STEP ? null : s.kg - KG_STEP }));
  const kgUp = () => change((s) => ({ ...s, kg: s.kg === null ? KG_STEP : s.kg + KG_STEP }));
  const amountDown = () =>
    change((s) =>
      draft.measure === "seconds"
        ? { ...s, seconds: Math.max(5, (s.seconds ?? 30) - 5) }
        : { ...s, reps: Math.max(1, (s.reps ?? 10) - 1) },
    );
  const amountUp = () =>
    change((s) =>
      draft.measure === "seconds"
        ? { ...s, seconds: (s.seconds ?? 30) + 5 }
        : { ...s, reps: (s.reps ?? 10) + 1 },
    );

  const done = () => {
    setError(undefined);
    startSaving(async () => {
      const result = await saveSets(exercise.id, draft);
      if (result.ok) onClose();
      else setError(tErr(result.error));
    });
  };

  const removeSet = () =>
    startSaving(async () => {
      const result = await deleteSet(set.id);
      if (result.ok) onClose();
      else setError(tErr(result.error));
    });

  const amountUnit = mode === "time" ? t("units.sec") : mode === "side" ? t("units.side") : mode === "max" ? "" : t("units.reps");

  return (
    <BottomSheet
      open
      onClose={onClose}
      eyebrow={perRound ? t("perRound") : t("setOf", { n: setIndex + 1, total: draft.sets.length })}
      title={name}
      footer={
        <>
          <FieldError message={error} />
          <PrimaryButton onClick={done} disabled={saving}>
            {saving ? t("saving") : t("done")}
          </PrimaryButton>
        </>
      }
    >
      <div
        role="radiogroup"
        aria-label={t("mode")}
        className="grid flex-none grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1"
      >
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setDraft((d) => applyMode(d, m, targets))}
            className={cn(
              "min-h-11 rounded-xl px-1 text-sm leading-[1.1] font-semibold",
              mode === m ? "bg-surface-1 text-text" : "text-text-2",
            )}
          >
            {t(`modes.${m}`)}
          </button>
        ))}
      </div>

      <Stepper
        label={t("weight")}
        hint={t("bodyweightHint")}
        value={set.kg === null ? t("bw") : formatKg(set.kg)}
        unit={set.kg === null ? t("bodyweight") : t("units.kg")}
        onDown={kgDown}
        onUp={kgUp}
        downLabel={t("decreaseWeight")}
        upLabel={t("increaseWeight")}
      />

      <Stepper
        label={t(`amountLabel.${mode}`)}
        value={mode === "max" ? t("max") : String(mode === "time" ? set.seconds : set.reps)}
        unit={amountUnit}
        onDown={amountDown}
        onUp={amountUp}
        dimmed={mode === "max"}
        downLabel={t("decrease")}
        upLabel={t("increase")}
      />

      {!perRound && draft.sets.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={applyAll}
            onClick={toggleApplyAll}
            className="flex min-h-12 items-center gap-3 text-base font-semibold text-text"
          >
            <span
              className={cn(
                "flex size-[26px] flex-none items-center justify-center rounded-lg text-on-brand",
                applyAll ? "bg-brand" : "border-2 border-line-strong",
              )}
            >
              {applyAll && <Check className="size-4" strokeWidth={3} />}
            </span>
            {t("applyAll", { count: draft.sets.length })}
          </button>
          <button
            type="button"
            onClick={removeSet}
            disabled={saving}
            className="min-h-11 px-1 text-[15px] font-semibold text-danger"
          >
            {t("deleteSet")}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
