"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { KG_STEP, formatKg } from "@/lib/sessions/format";
import type { SessionExercise, SetRow } from "@/lib/sessions/types";
import { plannedRow, type LogRow } from "./types";

function Stepper({
  label,
  value,
  unit,
  onDown,
  onUp,
  downLabel,
  upLabel,
}: {
  label: string;
  value: string;
  unit: string;
  onDown: () => void;
  onUp: () => void;
  downLabel: string;
  upLabel: string;
}) {
  const button = "flex size-16 flex-none items-center justify-center rounded-[18px] bg-surface-3 text-text active:scale-[.94]";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-semibold text-text-2">{label}</span>
      <div className="flex items-center gap-2 rounded-3xl bg-surface-2 p-2">
        <button type="button" aria-label={downLabel} onClick={onDown} className={button}>
          <Minus className="size-7" />
        </button>
        <div aria-live="polite" className="flex flex-1 items-baseline justify-center gap-1.5">
          <span className="text-[52px] leading-none font-extrabold tracking-[-0.02em]">{value}</span>
          <span className="text-[17px] font-semibold text-text-2">{unit}</span>
        </div>
        <button type="button" aria-label={upLabel} onClick={onUp} className={button}>
          <Plus className="size-7" />
        </button>
      </div>
    </div>
  );
}

// "Change actual value": what was really done for one set (or one round).
export function ActualSetSheet({
  item,
  set,
  row,
  name,
  where,
  plan,
  onSave,
  onClose,
}: {
  item: SessionExercise;
  set: SetRow;
  row: LogRow;
  name: string;
  where: string;
  plan: string;
  onSave: (row: LogRow) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Log.editor");
  const [draft, setDraft] = useState(row);
  const timed = item.measure === "seconds";
  const amount = timed ? draft.seconds : draft.reps;
  const step = timed ? 5 : 1;

  const setAmount = (next: number) =>
    setDraft((d) => (timed ? { ...d, seconds: Math.max(0, next) } : { ...d, reps: Math.max(0, next) }));

  const label = timed ? t("time") : set.max ? t("maxReps") : item.perSide ? t("repsSide") : t("reps");
  const unit = timed ? t("units.sec") : item.perSide ? t("units.side") : t("units.reps");

  return (
    <BottomSheet
      open
      onClose={onClose}
      eyebrow={where}
      title={name}
      footer={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setDraft(plannedRow(set, draft.done))}
            className="flex min-h-16 items-center gap-2 rounded-[18px] bg-surface-3 px-5 text-base font-semibold text-text"
          >
            <RotateCcw className="size-[18px]" aria-hidden />
            {t("reset")}
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...draft, done: true, ...(amount === null ? (timed ? { seconds: 30 } : { reps: 10 }) : {}) })}
            className="min-h-16 flex-1 rounded-[18px] bg-brand text-[17px] font-bold text-on-brand active:scale-[.98] active:bg-brand-press"
          >
            {t("save")}
          </button>
        </div>
      }
    >
      <p className="-mt-2 text-sm font-semibold text-text-3">{t("planned", { plan })}</p>
      <Stepper
        label={t("weight")}
        value={draft.kg === null ? t("bw") : formatKg(draft.kg)}
        unit={draft.kg === null ? t("bodyweight") : t("units.kg")}
        onDown={() => setDraft((d) => ({ ...d, kg: d.kg === null || d.kg <= KG_STEP ? null : d.kg - KG_STEP }))}
        onUp={() => setDraft((d) => ({ ...d, kg: d.kg === null ? KG_STEP : d.kg + KG_STEP }))}
        downLabel={t("decreaseWeight")}
        upLabel={t("increaseWeight")}
      />
      <Stepper
        label={label}
        value={amount === null ? "—" : String(amount)}
        unit={unit}
        onDown={() => setAmount((amount ?? (timed ? 30 : 10)) - step)}
        onUp={() => setAmount(amount === null ? (timed ? 30 : 10) : amount + step)}
        downLabel={t("decrease")}
        upLabel={t("increase")}
      />
    </BottomSheet>
  );
}
