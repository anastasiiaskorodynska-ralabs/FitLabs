"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, CircleDashed, Play, Plus, X } from "lucide-react";
import { DAY_TYPE_STYLE, type DayType } from "@/lib/day-types";
import { addDays, weekdayOf } from "@/lib/sessions/format";
import type { SessionStatus } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";
import { GenerateWeek } from "./generate-week";
import { LogWorkoutSheet } from "./log-workout-sheet";

export type WeekSession = {
  id: string;
  date: string;
  dayType: DayType;
  status: SessionStatus;
  exercises: number;
  minutes: number;
};

const BADGE: Record<SessionStatus, { icon: typeof Check; className: string }> = {
  done: { icon: Check, className: "bg-done-tint text-done-text" },
  skipped: { icon: X, className: "bg-skip-tint text-skip-text" },
  planned: { icon: CircleDashed, className: "border-[1.5px] border-line-strong text-text-2" },
};

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function WeekView({
  start,
  today,
  currentStart,
  sessions,
  schedule,
}: {
  start: string;
  today: string;
  currentStart: string;
  sessions: WeekSession[];
  schedule: { weekday: number; dayType: DayType }[];
}) {
  const t = useTranslations("Week");
  const tDays = useTranslations("Days");
  const tTypes = useTranslations("DayTypes");
  const format = useFormatter();
  // Date to open "Log workout" on; null = closed.
  const [logDate, setLogDate] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = days[6];
  const offset = Math.round((utc(start).getTime() - utc(currentStart).getTime()) / (7 * 864e5));
  const relative =
    offset === 0 ? t("thisWeek") : offset === 1 ? t("nextWeek") : offset === -1 ? t("lastWeek") : String(utc(start).getUTCFullYear());
  const nextPlanned = offset === 0 ? sessions.find((s) => s.status === "planned" && s.date >= today) : undefined;
  const done = sessions.filter((s) => s.status === "done").length;
  // Schedule days from today on without a session: what "Generate" would plan.
  const targets = schedule
    .map((d) => ({ date: addDays(start, d.weekday), dayType: d.dayType }))
    .filter((d) => d.date >= today && !sessions.some((s) => s.date === d.date));

  return (
    <>
      <header className="flex flex-none flex-col gap-3.5 border-b border-line px-3 pt-[max(12px,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/week?start=${addDays(start, -7)}`}
            aria-label={t("prev")}
            className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-surface-2 text-text active:scale-[.94]"
          >
            <ChevronLeft className="size-6" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
            <h1 className="text-[22px] leading-[1.15] font-extrabold tracking-[-0.01em]">
              {format.dateTimeRange(utc(start), utc(end), { month: "short", day: "numeric", timeZone: "UTC" })}
            </h1>
            <span className="text-[13px] font-semibold text-text-3">{relative}</span>
          </div>
          <Link
            href={`/week?start=${addDays(start, 7)}`}
            aria-label={t("next")}
            className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-surface-2 text-text active:scale-[.94]"
          >
            <ChevronRight className="size-6" />
          </Link>
        </div>
        <ol className="grid grid-cols-7 gap-1 px-1">
          {days.map((d, i) => {
            const session = sessions.find((s) => s.date === d);
            const isToday = d === today;
            const dayClass = cn(
              "flex h-16 w-full flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] active:scale-[.94]",
              isToday ? "border-brand bg-surface-2" : "border-transparent",
            );
            const label = format.dateTime(utc(d), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
            const content = (
              <>
                <span className="text-xs font-bold text-text-3">{tDays(`letter.${i}`)}</span>
                <span className={cn("text-[17px] leading-none font-bold", isToday || session ? "text-text" : "text-text-2")}>
                  {utc(d).getUTCDate()}
                </span>
                <span className={cn("size-1.5 rounded-full", session ? DAY_TYPE_STYLE[session.dayType].dot : "bg-transparent")} />
              </>
            );
            // A day with a session opens it; an empty day starts "Log workout" on that date.
            return (
              <li key={d} aria-current={isToday ? "date" : undefined}>
                {session ? (
                  <Link href={`/session/${session.id}`} aria-label={t("openDay", { day: label })} className={dayClass}>
                    {content}
                  </Link>
                ) : (
                  <button type="button" onClick={() => setLogDate(d)} aria-label={t("logDay", { day: label })} className={dayClass}>
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-4 pb-5">
        {sessions.length > 0 ? (
          <>
            <div className="flex items-center justify-between gap-3 px-0.5">
              <span className="text-[15px] font-bold">{t("sessions", { count: sessions.length })}</span>
              <span className="text-[15px] font-semibold text-text-2">
                {t("doneOf", { done, total: sessions.length })}
              </span>
            </div>
            {sessions.map((s) => {
              const style = DAY_TYPE_STYLE[s.dayType];
              const badge = BADGE[s.status];
              const BadgeIcon = badge.icon;
              const isNext = s.id === nextPlanned?.id;
              const prefix = s.date === today ? t("today") : s.date === addDays(today, 1) ? t("tomorrow") : "";
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className={cn(
                    "flex flex-none flex-col gap-3.5 rounded-[20px] bg-surface-1 p-3.5 active:scale-[.99]",
                    isNext ? "border-[1.5px] border-line-strong" : "border border-line",
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={cn("flex size-14 flex-none flex-col items-center justify-center gap-0.5 rounded-[14px]", style.tint)}>
                      <span className="text-[11px] font-bold tracking-[0.06em] uppercase">
                        {tDays(`short.${weekdayOf(s.date)}`)}
                      </span>
                      <span className="text-[22px] leading-none font-extrabold">{utc(s.date).getUTCDate()}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[17px] leading-[1.25] font-bold">{tTypes(`long.${s.dayType}`)}</span>
                      <span className="text-[13px] leading-[1.35] text-text-2">
                        {prefix && `${prefix} · `}
                        {s.exercises
                          ? t("meta", { count: s.exercises, minutes: s.minutes })
                          : t("noExercises")}
                      </span>
                    </div>
                    <span className={cn("flex min-h-[30px] flex-none items-center gap-1.5 rounded-full pr-3 pl-2.5 text-[13px] font-bold", badge.className)}>
                      <BadgeIcon className="size-[15px]" aria-hidden />
                      {t(`status.${s.status}`)}
                    </span>
                  </div>
                  {isNext && (
                    <span className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-brand text-[17px] font-bold text-on-brand">
                      <Play className="size-[18px]" aria-hidden />
                      {t("start")}
                    </span>
                  )}
                </Link>
              );
            })}
          </>
        ) : (
          <div className="flex flex-[1_0_auto] flex-col justify-center gap-6 px-1 py-2">
            <div className="flex flex-col items-center gap-4 text-center">
              <h2 className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em] text-balance">
                {t("emptyTitle")}
              </h2>
              <p className="text-base leading-[1.45] text-text-2 text-pretty">
                {targets.length ? t("emptyBody", { count: targets.length }) : t("emptyPast")}
              </p>
            </div>
            {schedule.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {schedule.map((d) => (
                  <span
                    key={d.weekday}
                    className={cn("flex min-h-8 items-center gap-2 rounded-full px-3 text-[13px] font-bold", DAY_TYPE_STYLE[d.dayType].tint)}
                  >
                    <span className={cn("size-2 rounded-full", DAY_TYPE_STYLE[d.dayType].dot)} />
                    {tDays(`short.${d.weekday}`)} · {tTypes(`short.${d.dayType}`)}
                  </span>
                ))}
              </div>
            )}
            {targets.length > 0 && <GenerateWeek weekStart={start} targets={targets} />}
          </div>
        )}

        <button
          type="button"
          onClick={() => setLogDate(days.includes(today) ? today : days[0])}
          className="mt-1 flex min-h-14 flex-none items-center justify-center gap-2 rounded-2xl border-[1.5px] border-line-strong text-base font-semibold text-text active:scale-[.98]"
        >
          <Plus className="size-5" aria-hidden />
          {t("log")}
        </button>
      </div>

      {logDate && (
        <LogWorkoutSheet
          days={days}
          initialDate={logDate}
          sessions={sessions}
          schedule={schedule}
          onClose={() => setLogDate(null)}
        />
      )}
    </>
  );
}
