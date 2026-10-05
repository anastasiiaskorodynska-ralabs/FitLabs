"use client";

import { useFormatter, useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { DAY_TYPE_STYLE } from "@/lib/day-types";
import type { ExerciseProgress } from "@/lib/history/data";
import { formatKg } from "@/lib/sessions/format";
import { ProgressChart } from "./progress-chart";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

// Most common reps on the top set, e.g. "15" or "12/side".
function usualReps(p: ExerciseProgress, sideLabel: string) {
  const counts = new Map<number, number>();
  for (const pt of p.points) if (pt.reps !== null) counts.set(pt.reps, (counts.get(pt.reps) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best === undefined ? "—" : `${best}${p.perSide ? sideLabel : ""}`;
}

// Per-exercise progress (History · Progress in /design).
export function HistoryProgress({ exercise }: { exercise: ExerciseProgress | undefined }) {
  const t = useTranslations("History.progress");
  const format = useFormatter();
  if (!exercise) return <p className="px-3 py-10 text-center text-[15px] text-text-2">{t("empty")}</p>;

  const values = exercise.points.map((p) => p.kg);
  const first = exercise.points[0];
  const current = values[values.length - 1];
  const change = current - values[0];
  const date = (iso: string) => format.dateTime(utc(iso), { month: "short", day: "numeric", timeZone: "UTC" });
  const middle = exercise.points[Math.floor(exercise.points.length / 2)];
  const type = exercise.dayType;

  return (
    <>
      <div className="flex flex-none items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-text-2">{t("topSet")}</span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[56px] leading-none font-extrabold tracking-[-0.03em]">{formatKg(current)}</span>
            <span className="text-[17px] font-semibold text-text-2">{t("kg")}</span>
          </span>
        </div>
        {exercise.points.length > 1 && (
          <span
            className={
              change > 0
                ? "flex min-h-8 items-center gap-1.5 rounded-full bg-done-tint px-3 text-sm font-bold text-done-text"
                : "flex min-h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-bold text-text-2"
            }
          >
            {change > 0 && <TrendingUp className="size-4" aria-hidden />}
            {t("change", { sign: change > 0 ? "+" : change < 0 ? "−" : "", kg: formatKg(Math.abs(change)), date: date(first.date) })}
          </span>
        )}
      </div>

      <ProgressChart
        values={values}
        labels={[date(first.date), date(middle.date), date(exercise.points[values.length - 1].date)]}
        stroke={`var(--${type})`}
        fill={`var(--${type}-tint)`}
        dot={DAY_TYPE_STYLE[type].dot}
        title={t("chartTitle", { name: exercise.name })}
      />

      <div className="grid flex-none grid-cols-3 gap-2">
        {[
          { value: formatKg(Math.max(...values)), label: t("best") },
          { value: String(exercise.points.length), label: t("sessions") },
          { value: usualReps(exercise, t("side")), label: t("usualReps") },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-2xl border border-line bg-surface-1 px-3 py-3.5">
            <span className="text-[22px] font-extrabold">{s.value}</span>
            <span className="text-xs font-semibold text-text-2">{s.label}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-none flex-col gap-0.5">
        <h2 className="px-0.5 pb-2 text-[13px] font-bold tracking-[0.06em] text-text-3 uppercase">{t("recent")}</h2>
        {[...exercise.points].reverse().slice(0, 4).map((p) => (
          <div key={p.date} className="flex min-h-[52px] items-center gap-3 border-b border-line px-0.5">
            <span className="w-16 text-sm font-semibold text-text-2">{date(p.date)}</span>
            <span className="flex-1 text-[17px] font-bold">
              {t("value", { kg: formatKg(p.kg), reps: p.reps === null ? "—" : `${p.reps}${exercise.perSide ? t("side") : ""}` })}
            </span>
            <span className="text-[13px] text-text-3">{t("setCount", { count: p.sets })}</span>
          </div>
        ))}
      </section>
    </>
  );
}
