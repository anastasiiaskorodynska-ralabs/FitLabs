"use client";

import { useTranslations } from "next-intl";
import { DAY_TYPES, SESSION_LENGTHS } from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";
import { FieldError, FieldLabel, Segmented, StepIntro } from "../controls";
import type { StepProps } from "../types";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const FOCUS_ACTIVE: Record<(typeof DAY_TYPES)[number], string> = {
  lower: "border-lower bg-lower-tint text-lower-text",
  upper: "border-upper bg-upper-tint text-upper-text",
  func: "border-func bg-func-tint text-func-text",
  full: "border-text-2 bg-surface-3 text-text",
};

export function ScheduleStep({ draft, update, errors, errorText }: StepProps) {
  const t = useTranslations("Onboarding.schedule");
  const tDays = useTranslations("Days");
  const tTypes = useTranslations("DayTypes");

  const toggleDay = (weekday: number) => {
    const exists = draft.days.some((d) => d.weekday === weekday);
    const days = exists
      ? draft.days.filter((d) => d.weekday !== weekday)
      : [...draft.days, { weekday, dayType: "full" as const }].sort((a, b) => a.weekday - b.weekday);
    update({ days });
  };

  const setFocus = (weekday: number, dayType: (typeof DAY_TYPES)[number]) =>
    update({ days: draft.days.map((d) => (d.weekday === weekday ? { ...d, dayType } : d)) });

  return (
    <>
      <StepIntro title={t("title")} sub={t("sub")} />

      <div className="flex flex-col gap-2">
        <div role="group" aria-label={t("days")} className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((weekday) => {
            const on = draft.days.some((d) => d.weekday === weekday);
            return (
              <button
                key={weekday}
                type="button"
                aria-pressed={on}
                aria-label={tDays(`long.${weekday}`)}
                onClick={() => toggleDay(weekday)}
                className={cn(
                  "h-14 rounded-2xl text-base font-bold",
                  on ? "bg-brand text-on-brand" : "border border-line bg-surface-1 text-text-2",
                )}
              >
                {tDays(`letter.${weekday}`)}
              </button>
            );
          })}
        </div>
        <FieldError message={errorText(errors.days)} />
      </div>

      {draft.days.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {draft.days.map((day) => (
            <div
              key={day.weekday}
              className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-surface-1 p-3.5"
            >
              <span className="text-base font-bold">{tDays(`long.${day.weekday}`)}</span>
              <div
                role="radiogroup"
                aria-label={tDays(`long.${day.weekday}`)}
                className="grid grid-cols-4 gap-1.5"
              >
                {DAY_TYPES.map((type) => {
                  const on = day.dayType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setFocus(day.weekday, type)}
                      className={cn(
                        "min-h-11 rounded-xl border-[1.5px] px-0.5 py-1 text-[13px] leading-[1.15] font-bold",
                        on ? FOCUS_ACTIVE[type] : "border-line text-text-2",
                      )}
                    >
                      {tTypes(`short.${type}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <FieldLabel>{t("length")}</FieldLabel>
        <Segmented
          label={t("length")}
          value={draft.sessionLength}
          onChange={(sessionLength) => update({ sessionLength })}
          options={SESSION_LENGTHS.map((n) => ({
            value: n,
            label: (
              <span className="flex flex-col items-center">
                <span className="text-lg leading-none font-extrabold">{n}</span>
                <span className="text-[11px] font-semibold">{t("min")}</span>
              </span>
            ),
          }))}
        />
      </div>
    </>
  );
}
