"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DAY_TYPE_STYLE } from "@/lib/day-types";
import type { ExerciseProgress, HistorySession } from "@/lib/history/data";
import { DAY_TYPES } from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";
import { FilterChip } from "./filter-chip";
import { HistoryProgress } from "./history-progress";
import { HistorySessions } from "./history-sessions";

type Tab = "sessions" | "progress";
type TypeFilter = "all" | (typeof DAY_TYPES)[number];

export function HistoryView({ sessions, progress }: { sessions: HistorySession[]; progress: ExerciseProgress[] }) {
  const t = useTranslations("History");
  const tTypes = useTranslations("DayTypes");
  const [tab, setTab] = useState<Tab>("sessions");
  const [type, setType] = useState<TypeFilter>("all");
  const [exerciseId, setExerciseId] = useState(progress[0]?.exerciseId);

  // Only offer the types that appear in History.
  const types = DAY_TYPES.filter((d) => sessions.some((s) => s.dayType === d));
  const filtered = type === "all" ? sessions : sessions.filter((s) => s.dayType === type);

  return (
    <>
      <header className="flex flex-none flex-col gap-3.5 border-b border-line px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">{t("title")}</h1>
        <div role="tablist" aria-label={t("title")} className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
          {(["sessions", "progress"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn("min-h-11 rounded-xl text-[15px] font-semibold", tab === key ? "bg-surface-1 text-text" : "text-text-2")}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {tab === "sessions" ? (
            <>
              <FilterChip active={type === "all"} onClick={() => setType("all")}>
                {t("all")}
              </FilterChip>
              {types.map((d) => (
                <FilterChip key={d} active={type === d} onClick={() => setType(d)} dot={DAY_TYPE_STYLE[d].dot}>
                  {tTypes(`short.${d}`)}
                </FilterChip>
              ))}
            </>
          ) : (
            progress.map((p) => (
              <FilterChip key={p.exerciseId} active={exerciseId === p.exerciseId} onClick={() => setExerciseId(p.exerciseId)}>
                {p.name}
              </FilterChip>
            ))
          )}
        </div>
      </header>

      <div role="tabpanel" className={cn("flex flex-1 flex-col px-5 pt-4 pb-5", tab === "sessions" ? "gap-[22px]" : "gap-[18px]")}>
        {tab === "sessions" ? (
          <HistorySessions sessions={filtered} />
        ) : (
          <HistoryProgress exercise={progress.find((p) => p.exerciseId === exerciseId)} />
        )}
      </div>
    </>
  );
}
