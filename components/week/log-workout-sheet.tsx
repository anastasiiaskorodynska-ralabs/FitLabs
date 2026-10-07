"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createManualSession } from "@/app/session/actions";
import { BottomSheet, PrimaryButton } from "@/components/bottom-sheet";
import { DayTypePicker } from "@/components/day-type-picker";
import { FieldError, FieldLabel } from "@/components/onboarding/controls";
import { DEFAULT_DAY_TYPE, type DayType } from "@/lib/day-types";
import { weekdayOf } from "@/lib/sessions/format";
import { cn } from "@/lib/utils";
import type { WeekSession } from "./week-view";

// "+ Log workout": pick a day and focus, then build the session by hand.
export function LogWorkoutSheet({
  days,
  initialDate,
  sessions,
  schedule,
  onClose,
}: {
  days: string[];
  initialDate: string;
  sessions: WeekSession[];
  schedule: { weekday: number; dayType: DayType }[];
  onClose: () => void;
}) {
  const t = useTranslations("Week.logSheet");
  const tDays = useTranslations("Days");
  const router = useRouter();
  const typeFor = (d: string) => schedule.find((s) => s.weekday === weekdayOf(d))?.dayType ?? DEFAULT_DAY_TYPE;

  const [date, setDate] = useState(initialDate);
  const [dayType, setDayType] = useState<DayType>(typeFor(date));
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const existing = sessions.find((s) => s.date === date);

  const pickDate = (d: string) => {
    setDate(d);
    setDayType(sessions.find((s) => s.date === d)?.dayType ?? typeFor(d));
  };

  const submit = () => {
    if (existing) {
      router.push(`/session/${existing.id}`);
      return;
    }
    setError(undefined);
    startSaving(async () => {
      const result = await createManualSession({ date, dayType });
      if (result.ok) router.push(`/session/${result.data}`);
      else setError(t(`errors.${result.error}`));
    });
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={t("title")}
      footer={
        <>
          <FieldError message={error} />
          <PrimaryButton onClick={submit} disabled={saving}>
            {existing ? t("open") : t("create")}
          </PrimaryButton>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <FieldLabel>{t("day")}</FieldLabel>
        <div role="radiogroup" aria-label={t("day")} className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const on = d === date;
            const has = sessions.some((s) => s.date === d);
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={tDays(`long.${i}`)}
                onClick={() => pickDate(d)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] text-[15px] font-bold",
                  on ? "bg-brand text-on-brand" : "bg-surface-2 text-text-2",
                )}
              >
                <span className="text-[11px]">{tDays(`letter.${i}`)}</span>
                {new Date(`${d}T00:00:00Z`).getUTCDate()}
                {has && <span className={cn("size-1 rounded-full", on ? "bg-on-brand" : "bg-text-3")} />}
              </button>
            );
          })}
        </div>
      </div>

      {existing ? (
        <p className="text-[15px] leading-[1.45] text-text-2">{t("exists")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <FieldLabel>{t("focus")}</FieldLabel>
          <DayTypePicker value={dayType} onChange={setDayType} label={t("focus")} />
        </div>
      )}
    </BottomSheet>
  );
}
