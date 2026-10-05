"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Check, ChevronLeft, Link2, Minus, Plus, Repeat, Sparkles, Target } from "lucide-react";
import { logSession } from "@/app/session/[id]/log/actions";
import { FieldError } from "@/components/onboarding/controls";
import { DAY_TYPE_STYLE, type DayType } from "@/lib/day-types";
import { blockLabels, formatKg } from "@/lib/sessions/format";
import type { LibraryExercise, Session, SetRow } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";
import { ActualSetSheet } from "./actual-set-sheet";
import { LogExercise } from "./log-exercise";
import { LogSuccess } from "./log-success";
import { initialRow, needsAmount, plannedRow, versusPlan, type LogRow } from "./types";

export type NextSession = { id: string; date: string; dayType: DayType };

export function LogView({
  session,
  library,
  next,
}: {
  session: Session;
  library: LibraryExercise[];
  next: NextSession | null;
}) {
  const t = useTranslations("Log");
  const tS = useTranslations("Session");
  const tTypes = useTranslations("DayTypes");
  const format = useFormatter();
  const byId = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);
  const allItems = session.blocks.flatMap((b) => b.exercises);

  const [rows, setRows] = useState<Record<string, LogRow>>(() =>
    Object.fromEntries(allItems.flatMap((e) => e.sets.map((s) => [s.id, initialRow(s)]))),
  );
  const [rounds, setRounds] = useState<Record<string, number>>(() =>
    Object.fromEntries(session.blocks.filter((b) => b.kind === "circuit").map((b) => [b.id, b.actualRounds ?? b.rounds ?? 1])),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(allItems.map((e) => [e.id, e.notes ?? ""])));
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allItems.map((e) => [e.id, Boolean(e.notes)])),
  );
  const [sessionNotes, setSessionNotes] = useState(session.notes ?? "");
  const [saveExample, setSaveExample] = useState(true);
  const [editing, setEditing] = useState<{ itemId: string; index: number } | null>(null);
  const [result, setResult] = useState<"done" | "skipped" | null>(null);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const kinds = blockLabels(session.blocks);
  const allSets = allItems.flatMap((e) => e.sets);
  const logged = allSets.filter((s) => rows[s.id].done).length;

  const planText = (item: (typeof allItems)[number]) => (set: SetRow) => {
    if (item.measure === "seconds") return t("plan.time", { seconds: set.seconds ?? 0 });
    const kg = set.kg === null ? t("bw") : formatKg(set.kg);
    const reps = set.max ? t("plan.max") : `${set.reps ?? 0}${item.perSide ? t("units.side") : ""}`;
    return `${kg} × ${reps}`;
  };

  const setRow = (row: LogRow) => setRows((r) => ({ ...r, [row.id]: row }));

  const stats = () => {
    let up = 0;
    let down = 0;
    for (const item of allItems) {
      for (const set of item.sets) {
        const row = rows[set.id];
        if (!row.done) continue;
        const d = versusPlan(item, set, row).overall;
        if (d > 0) up++;
        if (d < 0) down++;
      }
    }
    return { logged, total: allSets.length, up, down };
  };

  const save = (status: "done" | "skipped") => {
    setError(undefined);
    startSaving(async () => {
      const res = await logSession({
        sessionId: session.id,
        status,
        notes: sessionNotes,
        saveExample,
        sets: Object.values(rows),
        rounds: Object.entries(rounds).map(([id, n]) => ({ id, rounds: n })),
        exerciseNotes: Object.entries(notes).map(([id, n]) => ({ id, notes: n })),
      });
      if (res.ok) setResult(status);
      else setError(t(`errors.${res.error}`));
    });
  };

  if (result) {
    return (
      <LogSuccess
        status={result}
        dayType={session.dayType}
        date={session.date}
        stats={stats()}
        savedExample={saveExample}
        next={next}
        onEdit={() => setResult(null)}
      />
    );
  }

  const editItem = editing && allItems.find((e) => e.id === editing.itemId);
  const editSet = editItem?.sets[editing!.index];
  const date = format.dateTime(new Date(`${session.date}T00:00:00Z`), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-bg">
      <header className="flex flex-none flex-col gap-2.5 border-b border-line px-3 pt-[env(safe-area-inset-top)] pb-3">
        <div className="flex h-12 items-center gap-2">
          <Link href={`/session/${session.id}`} aria-label={t("back")} className="flex size-11 flex-none items-center justify-center rounded-xl text-text">
            <ChevronLeft className="size-[26px]" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="text-xl font-extrabold tracking-[-0.01em]">{t("title")}</h1>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text-2">
              <span className={cn("size-2 rounded-full", DAY_TYPE_STYLE[session.dayType].dot)} />
              {tTypes(`long.${session.dayType}`)} · {date}
            </span>
          </div>
          <span className="pr-2 text-[15px] font-bold text-text-2" aria-label={t("loggedOf", { logged, total: allSets.length })}>
            {logged}/{allSets.length}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progress")}
          aria-valuemin={0}
          aria-valuemax={allSets.length}
          aria-valuenow={logged}
          className="mx-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
        >
          <div
            className="h-full rounded-full bg-done transition-[width] duration-200"
            style={{ width: `${allSets.length ? Math.round((logged / allSets.length) * 100) : 0}%` }}
          />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-3.5 pb-5">
        {session.blocks.length === 0 && <p className="px-3 py-8 text-center text-[15px] text-text-2">{t("empty")}</p>}

        {session.blocks.map((block, bi) => {
          const kind = kinds[bi];
          const isFinisher = block.role === "finisher";
          const circuit = block.kind === "circuit";
          const Icon = isFinisher ? Target : block.kind === "superset" ? Link2 : Repeat;
          const label =
            kind.kind === "finisher"
              ? tS("blocks.finisher")
              : kind.kind === "superset"
                ? tS("blocks.superset", { letter: kind.letter ?? "" })
                : tS("blocks.circuit", { n: kind.index ?? 0 });
          const done = rounds[block.id];

          return (
            <section
              key={block.id}
              className={cn(
                "flex flex-none flex-col rounded-[22px]",
                isFinisher ? "border-[1.5px] border-dashed border-line-strong bg-surface-2" : "border border-line bg-surface-1",
              )}
            >
              {(block.kind !== "single" || isFinisher) && (
                <div className="flex items-center gap-2.5 pt-3.5 pr-3 pb-1 pl-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <div className="flex items-center gap-2">
                      <Icon className="size-[18px] text-text-2" aria-hidden />
                      <h2 className="text-lg font-extrabold">{label}</h2>
                      {isFinisher && (
                        <span className="flex min-h-6 items-center rounded-full bg-text px-2 text-[11px] font-extrabold tracking-[0.06em] text-bg">
                          {tS("blocks.finisherBadge")}
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] font-semibold text-text-2">
                      {circuit ? t("planRounds", { rounds: block.rounds ?? 1 }) : tS("meta.sets", { sets: block.exercises[0]?.sets.length ?? 0, rest: block.restSec ?? 0 })}
                    </span>
                  </div>
                  {circuit && (
                    <div className="flex items-center gap-1 rounded-[14px] bg-surface-3 p-1">
                      <button
                        type="button"
                        aria-label={t("fewerRounds")}
                        onClick={() => setRounds((r) => ({ ...r, [block.id]: Math.max(0, done - 1) }))}
                        className="flex size-10 items-center justify-center rounded-[10px] text-text"
                      >
                        <Minus className="size-[18px]" />
                      </button>
                      <span className="flex min-w-11 flex-col items-center leading-none" aria-live="polite">
                        <span className="text-lg font-extrabold">
                          {done}/{block.rounds ?? 1}
                        </span>
                        <span className="mt-0.5 text-[10px] font-bold text-text-2 uppercase">{t("rounds")}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={t("moreRounds")}
                        onClick={() => setRounds((r) => ({ ...r, [block.id]: Math.min(50, done + 1) }))}
                        className="flex size-10 items-center justify-center rounded-[10px] text-text"
                      >
                        <Plus className="size-[18px]" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {block.exercises.map((item, i) => {
                const info = byId.get(item.exerciseId);
                const itemRows = item.sets.map((s) => rows[s.id]);
                const equipment = info?.equipment.length ? info.equipment.map((q) => q.name).join(" · ") : tS("bodyweight");
                const sub = circuit
                  ? t("perRound")
                  : block.kind === "single" && !isFinisher
                    ? tS("meta.sets", { sets: item.sets.length, rest: block.restSec ?? 0 })
                    : [equipment, item.perSide && tS("perSide")].filter(Boolean).join(" · ");

                return (
                  <LogExercise
                    key={item.id}
                    item={item}
                    info={info}
                    tag={kind.letter ? `${kind.letter}${i + 1}` : undefined}
                    sub={sub}
                    divider={i > 0 || block.kind !== "single" || isFinisher}
                    rows={itemRows}
                    note={notes[item.id]}
                    noteOpen={noteOpen[item.id]}
                    planText={planText(item)}
                    onToggle={(index) => {
                      const row = itemRows[index];
                      if (row.done) setRow({ ...row, done: false });
                      else if (needsAmount(item, row)) setEditing({ itemId: item.id, index });
                      else setRow({ ...row, done: true });
                    }}
                    onEdit={(index) => setEditing({ itemId: item.id, index })}
                    onAllPlanned={() =>
                      item.sets.forEach((set, k) => {
                        if (itemRows[k].done) return;
                        const planned = plannedRow(set, true);
                        if (!needsAmount(item, planned)) setRow(planned);
                      })
                    }
                    onOpenNote={() => setNoteOpen((o) => ({ ...o, [item.id]: true }))}
                    onNote={(value) => setNotes((n) => ({ ...n, [item.id]: value }))}
                  />
                );
              })}
            </section>
          );
        })}

        <label className="flex flex-none flex-col gap-2 pt-1">
          <span className="text-[15px] font-semibold text-text-2">{t("sessionNotes")}</span>
          <textarea
            rows={3}
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder={t("sessionNotesPlaceholder")}
            className="resize-none rounded-[14px] border-[1.5px] border-line-strong bg-surface-1 px-4 py-3.5 text-base leading-[1.45] font-medium text-text outline-none focus:border-2 focus:border-brand"
          />
        </label>
      </main>

      <footer className="flex flex-none flex-col gap-2.5 border-t border-line bg-bg px-4 pt-2.5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          role="switch"
          aria-checked={saveExample}
          onClick={() => setSaveExample((v) => !v)}
          className="flex min-h-[52px] items-center gap-3 px-1 text-left text-text"
        >
          <Sparkles className="size-5 flex-none text-brand-text" aria-hidden />
          <span className="flex flex-1 flex-col gap-px">
            <span className="text-base font-bold">{t("saveExample")}</span>
            <span className="text-xs text-text-2">{t("saveExampleHint")}</span>
          </span>
          <span className={cn("flex h-8 w-[52px] flex-none rounded-full p-[3px] transition-colors", saveExample ? "justify-end bg-brand" : "justify-start bg-surface-3")}>
            <span className="size-[26px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.3)]" />
          </span>
        </button>
        <FieldError message={error} />
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => save("skipped")}
            disabled={saving}
            className="min-h-16 rounded-[18px] bg-surface-3 px-[22px] text-[17px] font-semibold text-text active:scale-[.98] disabled:opacity-60"
          >
            {t("skipped")}
          </button>
          <button
            type="button"
            onClick={() => save("done")}
            disabled={saving}
            className="flex min-h-16 flex-1 items-center justify-center gap-2.5 rounded-[18px] bg-brand text-[17px] font-bold text-on-brand active:scale-[.98] active:bg-brand-press disabled:opacity-60"
          >
            <Check className="size-[22px]" aria-hidden />
            {saving ? t("saving") : t("markDone")}
          </button>
        </div>
      </footer>

      {editItem && editSet && (
        <ActualSetSheet
          key={editSet.id}
          item={editItem}
          set={editSet}
          row={rows[editSet.id]}
          name={byId.get(editItem.exerciseId)?.name ?? t("unknownExercise")}
          where={editItem.sets.length > 1 ? tS("editor.setOf", { n: editing!.index + 1, total: editItem.sets.length }) : t("perRound")}
          plan={planText(editItem)(editSet)}
          onSave={(row) => {
            setRow(row);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
