"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Check, CircleDashed, Sparkles, X } from "lucide-react";
import { DAY_TYPE_STYLE, type DayType } from "@/lib/day-types";
import { weekStart, weekdayOf } from "@/lib/sessions/format";
import { cn } from "@/lib/utils";
import type { NextSession } from "./log-view";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

// After saving: summary, "saved as example" note and the next planned session.
export function LogSuccess({
  status,
  dayType,
  date,
  stats,
  savedExample,
  next,
  onEdit,
}: {
  status: "done" | "skipped";
  dayType: DayType;
  date: string;
  stats: { logged: number; total: number; up: number; down: number };
  savedExample: boolean;
  next: NextSession | null;
  onEdit: () => void;
}) {
  const t = useTranslations("Log.success");
  const tDays = useTranslations("Days");
  const tTypes = useTranslations("DayTypes");
  const format = useFormatter();
  const done = status === "done";
  const when = `${tTypes(`long.${dayType}`)} · ${format.dateTime(utc(date), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}`;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-bg">
      <main className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-5 pt-[max(40px,env(safe-area-inset-top))] pb-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            className={cn(
              "flex size-24 items-center justify-center rounded-full",
              done ? "bg-done-tint text-done-text" : "bg-surface-3 text-text-2",
            )}
          >
            {done ? <Check className="size-12" aria-hidden /> : <X className="size-12" aria-hidden />}
          </span>
          <h1 className="text-[32px] leading-[1.1] font-extrabold tracking-[-0.02em]">{done ? t("doneTitle") : t("skippedTitle")}</h1>
          <p className="text-base leading-[1.45] text-text-2 text-pretty">
            {done ? t("doneBody", { when }) : t("skippedBody", { when })}
          </p>
        </div>

        {done && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: `${stats.logged}/${stats.total}`, label: t("setsLogged"), className: "" },
              { value: String(stats.up), label: t("above"), className: "text-done-text" },
              { value: String(stats.down), label: t("below"), className: "" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 rounded-[18px] border border-line bg-surface-1 px-1.5 py-4">
                <span className={cn("text-[30px] leading-none font-extrabold", s.className)}>{s.value}</span>
                <span className="text-xs font-semibold text-text-2">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {done && savedExample && (
          <div className="flex items-center gap-3 rounded-2xl bg-brand-tint px-4 py-3.5">
            <Sparkles className="size-5 flex-none text-brand-text" aria-hidden />
            <span className="flex-1 text-[15px] leading-[1.4] font-semibold">{t("savedExample")}</span>
          </div>
        )}

        {next && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[13px] font-bold tracking-[0.06em] text-text-3 uppercase">{t("upNext")}</h2>
            <Link href={`/session/${next.id}`} className="flex items-center gap-3.5 rounded-[20px] border border-line bg-surface-1 p-3.5">
              <div className={cn("flex size-14 flex-none flex-col items-center justify-center gap-0.5 rounded-[14px]", DAY_TYPE_STYLE[next.dayType].tint)}>
                <span className="text-[11px] font-bold tracking-[0.06em] uppercase">{tDays(`short.${weekdayOf(next.date)}`)}</span>
                <span className="text-[22px] leading-none font-extrabold">{utc(next.date).getUTCDate()}</span>
              </div>
              <span className="flex-1 text-[17px] font-bold">{tTypes(`long.${next.dayType}`)}</span>
              <span className="flex min-h-[30px] flex-none items-center gap-1.5 rounded-full border-[1.5px] border-line-strong pr-3 pl-2.5 text-[13px] font-bold text-text-2">
                <CircleDashed className="size-[15px]" aria-hidden />
                {t("planned")}
              </span>
            </Link>
          </section>
        )}
      </main>

      <div className="flex flex-none flex-col gap-2.5 px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <Link
          href={`/week?start=${weekStart(date)}`}
          className="flex min-h-16 items-center justify-center rounded-[18px] bg-brand text-[17px] font-bold text-on-brand active:scale-[.98]"
        >
          {t("backToWeek")}
        </Link>
        <button type="button" onClick={onEdit} className="min-h-[52px] rounded-2xl text-base font-semibold text-text-2">
          {t("edit")}
        </button>
      </div>
    </div>
  );
}
