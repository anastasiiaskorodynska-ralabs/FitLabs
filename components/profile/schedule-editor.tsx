"use client";

import { useTranslations } from "next-intl";
import { FieldError } from "@/components/onboarding/controls";
import { WEEKDAYS } from "@/components/onboarding/steps/schedule-step";
import type { StepProps } from "@/components/onboarding/types";
import { DAY_TYPE_STYLE, DEFAULT_DAY_TYPE } from "@/lib/day-types";
import { DAY_TYPES, SESSION_LENGTHS } from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";

// Compact schedule editor from the Profile "edit schedule" sheet in /design.
export function ScheduleEditor({ draft, update, errors, errorText }: StepProps) {
  const t = useTranslations("Onboarding.schedule");
  const tDays = useTranslations("Days");
  const tTypes = useTranslations("DayTypes");

  const toggleDay = (weekday: number) => {
    const exists = draft.days.some((d) => d.weekday === weekday);
    update({
      days: exists
        ? draft.days.filter((d) => d.weekday !== weekday)
        : [...draft.days, { weekday, dayType: DEFAULT_DAY_TYPE }].sort((a, b) => a.weekday - b.weekday),
    });
  };

  return (
    <>
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
                "h-[52px] rounded-[14px] text-[15px] font-bold",
                on ? "bg-brand text-on-brand" : "bg-surface-2 text-text-2",
              )}
            >
              {tDays(`letter.${weekday}`)}
            </button>
          );
        })}
      </div>
      <FieldError message={errorText(errors.days)} />

      {draft.days.length > 0 && (
        <div className="flex flex-col gap-2">
          {draft.days.map((day) => (
            <div key={day.weekday} className="flex items-center gap-2.5">
              <span className="w-10 text-[15px] font-bold">{tDays(`short.${day.weekday}`)}</span>
              <div
                role="radiogroup"
                aria-label={tDays(`long.${day.weekday}`)}
                className="grid flex-1 grid-cols-3 gap-1"
              >
                {DAY_TYPES.map((type) => {
                  const on = day.dayType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() =>
                        update({
                          days: draft.days.map((d) =>
                            d.weekday === day.weekday ? { ...d, dayType: type } : d,
                          ),
                        })
                      }
                      className={cn(
                        "min-h-11 rounded-xl border-[1.5px] p-0.5 text-xs leading-[1.1] font-bold",
                        on ? DAY_TYPE_STYLE[type].picked : "border-line text-text-2",
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

      <div
        role="radiogroup"
        aria-label={t("length")}
        className="grid grid-cols-5 gap-1 rounded-2xl bg-surface-2 p-1"
      >
        {SESSION_LENGTHS.map((n) => {
          const on = draft.sessionLength === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => update({ sessionLength: n })}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center rounded-xl",
                on ? "bg-surface-1 text-text" : "text-text-2",
              )}
            >
              <span className="text-[17px] leading-none font-extrabold">{n}</span>
              <span className="text-[11px] font-semibold">{t("min")}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
