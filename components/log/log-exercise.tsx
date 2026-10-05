"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Check, CheckCheck, NotebookPen } from "lucide-react";
import { ExerciseThumb } from "@/components/session/exercise-thumb";
import { formatKg } from "@/lib/sessions/format";
import type { LibraryExercise, SessionExercise, SetRow } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";
import { needsAmount, versusPlan, type LogRow } from "./types";

const tone = (d: number) => (d > 0 ? "text-done-text" : d < 0 ? "text-func-text" : "text-text");

function Arrow({ d }: { d: number }) {
  if (d > 0) return <ArrowUp className="size-[13px] flex-none" aria-hidden />;
  if (d < 0) return <ArrowDown className="size-[13px] flex-none" aria-hidden />;
  return null;
}

export function LogExercise({
  item,
  info,
  tag,
  sub,
  divider,
  rows,
  note,
  noteOpen,
  planText,
  onToggle,
  onEdit,
  onAllPlanned,
  onOpenNote,
  onNote,
}: {
  item: SessionExercise;
  info: LibraryExercise | undefined;
  tag?: string;
  sub: string;
  divider: boolean;
  rows: LogRow[];
  note: string;
  noteOpen: boolean;
  planText: (set: SetRow) => string;
  onToggle: (index: number) => void;
  onEdit: (index: number) => void;
  onAllPlanned: () => void;
  onOpenNote: () => void;
  onNote: (value: string) => void;
}) {
  const t = useTranslations("Log");
  const name = info?.name ?? t("unknownExercise");
  const allDone = rows.every((r) => r.done);
  const timed = item.measure === "seconds";

  return (
    <div className={cn("flex flex-col gap-2.5 p-3.5", divider && "border-t border-line")}>
      <div className="flex items-center gap-3">
        <span className="relative flex-none">
          <ExerciseThumb src={info?.images[0]} className="size-11" />
          {tag && (
            <span className="absolute -top-1.5 -left-1.5 flex h-[22px] min-w-6 items-center justify-center rounded-lg bg-text px-[5px] text-[11px] font-extrabold text-bg">
              {tag}
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] leading-[1.25] font-bold">{name}</span>
          <span className="text-[13px] text-text-2">{sub}</span>
        </div>
        <button
          type="button"
          onClick={onAllPlanned}
          className={cn("flex min-h-11 flex-none items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold", allDone ? "text-done-text" : "text-brand-text")}
        >
          <CheckCheck className="size-[18px]" aria-hidden />
          {allDone ? t("done") : t("allPlanned")}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[44px_70px_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-1 text-[11px] font-bold tracking-[0.06em] text-text-3 uppercase">
          <span />
          <span>{t("cols.plan")}</span>
          <span>{t("cols.kg")}</span>
          <span>{timed ? t("cols.sec") : t("cols.reps")}</span>
        </div>
        {item.sets.map((set, i) => {
          const row = rows[i];
          const empty = needsAmount(item, row);
          const vs = versusPlan(item, set, row);
          const amount = timed ? row.seconds : row.reps;
          return (
            <div
              key={set.id}
              className={cn(
                "grid grid-cols-[44px_70px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded-2xl p-1",
                row.done && "bg-done-tint",
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(i)}
                aria-pressed={row.done}
                aria-label={row.done ? t("undo") : t("markPlanned")}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full text-[15px] font-extrabold",
                  row.done ? "bg-done text-bg" : "border-2 border-line-strong text-text-2",
                )}
              >
                {row.done ? <Check className="size-[22px]" /> : item.sets.length > 1 ? i + 1 : ""}
              </button>
              <span className="text-sm leading-[1.25] font-semibold text-text-3">{planText(set)}</span>
              <button
                type="button"
                onClick={() => onEdit(i)}
                aria-label={t("editSet", { n: i + 1, name })}
                className={cn("flex min-h-12 min-w-0 items-center gap-[3px] overflow-hidden rounded-xl bg-surface-2 px-2", tone(vs.kg))}
              >
                <span className="text-xl font-extrabold tracking-[-0.01em]">{row.kg === null ? t("bw") : formatKg(row.kg)}</span>
                {row.kg !== null && <span className="text-[11px] font-semibold text-text-2">{t("units.kg")}</span>}
                <Arrow d={vs.kg} />
              </button>
              <button
                type="button"
                onClick={() => onEdit(i)}
                aria-label={t("editSet", { n: i + 1, name })}
                className={cn(
                  "flex min-h-12 min-w-0 items-center gap-[3px] overflow-hidden rounded-xl bg-surface-2 px-2",
                  empty ? "border-[1.5px] border-dashed border-brand text-text-2" : tone(vs.amount),
                )}
              >
                <span className="text-xl font-extrabold tracking-[-0.01em]">{empty ? "—" : amount}</span>
                <span className="text-xs font-semibold text-text-2">
                  {empty ? t("enter") : timed ? t("units.sec") : item.perSide ? t("units.side") : ""}
                </span>
                <Arrow d={vs.amount} />
              </button>
            </div>
          );
        })}
      </div>

      {noteOpen ? (
        <textarea
          rows={2}
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          aria-label={t("noteFor", { name })}
          className="resize-none rounded-[14px] border-[1.5px] border-line-strong bg-surface-1 px-3.5 py-3 text-base leading-[1.45] font-medium text-text outline-none focus:border-2 focus:border-brand"
        />
      ) : (
        <button
          type="button"
          onClick={onOpenNote}
          className="-ml-1.5 flex min-h-11 items-center gap-2 self-start rounded-xl px-2.5 text-sm font-semibold text-text-2"
        >
          <NotebookPen className="size-[18px]" aria-hidden />
          {t("addNote")}
        </button>
      )}
    </div>
  );
}
