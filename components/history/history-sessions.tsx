"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Check, CircleDashed, X } from "lucide-react";
import { DAY_TYPE_STYLE } from "@/lib/day-types";
import type { HistorySession } from "@/lib/history/data";
import { addDays, weekStart, weekdayOf } from "@/lib/sessions/format";
import { cn } from "@/lib/utils";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

const BADGE = {
  done: { icon: Check, className: "bg-done-tint text-done-text" },
  skipped: { icon: X, className: "bg-skip-tint text-skip-text" },
  planned: { icon: CircleDashed, className: "border-[1.5px] border-line-strong text-text-2" },
};

// Past sessions grouped by week (History · Sessions in /design).
export function HistorySessions({ sessions }: { sessions: HistorySession[] }) {
  const t = useTranslations("History");
  const tDays = useTranslations("Days");
  const tTypes = useTranslations("DayTypes");
  const format = useFormatter();

  const weeks = new Map<string, HistorySession[]>();
  for (const s of sessions) {
    const key = weekStart(s.date);
    weeks.set(key, [...(weeks.get(key) ?? []), s]);
  }

  if (!sessions.length) return <p className="px-3 py-10 text-center text-[15px] text-text-2">{t("empty")}</p>;

  return (
    <>
      {[...weeks.entries()].map(([start, items]) => (
        <section key={start} className="flex flex-none flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <h2 className="text-[15px] font-bold">
              {format.dateTimeRange(utc(start), utc(addDays(start, 6)), { month: "short", day: "numeric", timeZone: "UTC" })}
            </h2>
            <span className="text-[13px] font-semibold text-text-3">
              {t("doneOf", { done: items.filter((s) => s.status === "done").length, total: items.length })}
            </span>
          </div>
          {items.map((s) => {
            const style = DAY_TYPE_STYLE[s.dayType];
            const badge = BADGE[s.status];
            const Icon = badge.icon;
            const meta =
              s.status === "done"
                ? [s.durationMin && t("minutes", { minutes: s.durationMin }), t("sets", { count: s.setsLogged })].filter(Boolean).join(" · ")
                : t("notLogged");
            return (
              <Link
                key={s.id}
                href={s.status === "planned" ? `/session/${s.id}` : `/session/${s.id}/log`}
                className="flex items-center gap-3.5 rounded-[20px] border border-line bg-surface-1 p-3.5 active:scale-[.99]"
              >
                <div className={cn("flex size-[52px] flex-none flex-col items-center justify-center gap-0.5 rounded-[14px]", style.tint)}>
                  <span className="text-[11px] font-bold tracking-[0.06em] uppercase">{tDays(`short.${weekdayOf(s.date)}`)}</span>
                  <span className="text-xl leading-none font-extrabold">{utc(s.date).getUTCDate()}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-[17px] leading-[1.25] font-bold">{tTypes(`long.${s.dayType}`)}</span>
                  <span className="text-[13px] text-text-2">{meta}</span>
                </div>
                <span className={cn("flex min-h-[30px] flex-none items-center gap-1.5 rounded-full pr-3 pl-2.5 text-[13px] font-bold", badge.className)}>
                  <Icon className="size-[15px]" aria-hidden />
                  {t(`status.${s.status}`)}
                </span>
              </Link>
            );
          })}
        </section>
      ))}
    </>
  );
}
