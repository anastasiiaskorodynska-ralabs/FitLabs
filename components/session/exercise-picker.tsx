"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Filter, Search } from "lucide-react";
import type { LibraryExercise } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";
import { ExerciseThumb } from "./exercise-thumb";

// Searchable library list. Only exercises the user's equipment and rules allow,
// unless they choose to show the hidden ones. `rank` sorts the best matches first.
export function ExercisePicker({
  library,
  excludeId,
  rank,
  onPick,
  disabled,
}: {
  library: LibraryExercise[];
  excludeId?: string;
  rank?: (e: LibraryExercise) => number;
  onPick: (e: LibraryExercise) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Session.picker");
  const tM = useTranslations("Muscles");
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  const { list, hidden } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const candidates = library.filter((e) => e.id !== excludeId);
    const matches = candidates.filter(
      (e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.nameEn.toLowerCase().includes(q) ||
        e.equipment.some((x) => x.name.toLowerCase().includes(q)),
    );
    const visible = showHidden ? matches : matches.filter((e) => e.allowed);
    const sorted = rank ? [...visible].sort((a, b) => rank(b) - rank(a)) : visible;
    return { list: sorted, hidden: candidates.filter((e) => !e.allowed).length };
  }, [library, excludeId, query, showHidden, rank]);

  const equipmentText = (e: LibraryExercise) =>
    e.equipment.length ? e.equipment.map((x) => x.name).join(" · ") : t("bodyweight");

  return (
    <>
      <div className="flex flex-none flex-col gap-3.5">
        <label className="flex h-[52px] items-center gap-2.5 rounded-[14px] bg-surface-2 px-3.5 text-text-3 focus-within:ring-2 focus-within:ring-brand">
          <Search className="size-5" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="min-w-0 flex-1 bg-transparent text-[17px] font-medium text-text outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowHidden((v) => !v)}
          aria-pressed={showHidden}
          className="flex min-h-11 items-center gap-2 self-start text-[13px] font-semibold text-text-2"
        >
          <Filter className="size-[15px]" aria-hidden />
          {showHidden ? t("showingAll") : t("onlyYours", { count: hidden })}
          <span className="text-brand-text">{showHidden ? t("hideOthers") : t("showAll")}</span>
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(e)}
              className={cn(
                "flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-line bg-surface-1 p-2.5 text-left text-text active:bg-surface-2 disabled:opacity-60",
                !e.allowed && "border-dashed",
              )}
            >
              <ExerciseThumb src={e.images[0]} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-base font-bold">{e.name}</span>
                <span className="text-[13px] text-text-2">
                  {equipmentText(e)} · {e.muscles.map((m) => tM(m)).join(", ")}
                </span>
                {!e.allowed && <span className="text-xs font-semibold text-danger">{t("notAvailable")}</span>}
              </span>
              <ChevronRight className="size-5 flex-none text-text-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className="px-2 py-6 text-center text-[15px] text-text-2">{t("noResults")}</p>
      )}
    </>
  );
}
