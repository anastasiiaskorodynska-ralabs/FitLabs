"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Check, ChevronLeft, CircleDashed, ClipboardCheck, Link2, Plus, RefreshCw, Repeat, Sparkles, Target, X } from "lucide-react";
import { addSet, deleteExercise, moveExercise } from "@/app/session/actions";
import { FieldError } from "@/components/onboarding/controls";
import { DAY_TYPE_STYLE } from "@/lib/day-types";
import { blockLabels, estimateMinutes, exerciseCount, weekStart } from "@/lib/sessions/format";
import type { LibraryExercise, Session, SessionExercise } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";
import { AddExerciseSheet } from "./add-exercise-sheet";
import { BlockSheet } from "./block-sheet";
import { ExerciseInfoSheet } from "./exercise-info-sheet";
import { postAi } from "./ai-request";
import { ExerciseRow } from "./exercise-row";
import { RegenerateDaySheet } from "./regenerate-day-sheet";
import { SetEditorSheet } from "./set-editor-sheet";
import { SwapSheet } from "./swap-sheet";

type Sheet =
  | { t: "set"; item: SessionExercise; index: number; perRound: boolean }
  | { t: "swap"; item: SessionExercise }
  | { t: "info"; exerciseId: string }
  | { t: "block"; blockId: string }
  | { t: "add" }
  | { t: "day" };

const STATUS_ICON = { planned: CircleDashed, done: Check, skipped: X };

export function SessionView({ session, library }: { session: Session; library: LibraryExercise[] }) {
  const t = useTranslations("Session");
  const tTypes = useTranslations("DayTypes");
  const tErr = useTranslations("Session.errors");
  const format = useFormatter();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string>();
  const [busy, startBusy] = useTransition();
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const tAi = useTranslations("Session.ai");
  const router = useRouter();
  const close = () => setSheet(null);

  const byId = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);
  const { blocks } = session;
  const kinds = blockLabels(blocks);
  const labels = kinds.map((k) =>
    k.kind === "finisher"
      ? t("blocks.finisher")
      : k.kind === "superset"
        ? t("blocks.superset", { letter: k.letter })
        : k.kind === "circuit"
          ? t("blocks.circuit", { n: k.index })
          : t("blocks.single"),
  );

  // AI edits only apply to planned sessions; logged ones keep what was done.
  const planned = session.status === "planned";

  const regenerateExercise = async (id: string) => {
    setError(undefined);
    setRegenerating(id);
    const result = await postAi("/api/regenerate-exercise", { blockExerciseId: id, mode: "replace" });
    if (result.ok) router.refresh();
    else setError(tAi.has(`errors.${result.code}`) ? tAi(`errors.${result.code}`) : tAi("errors.failed"));
    setRegenerating(null);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(undefined);
    startBusy(async () => {
      const result = await fn();
      if (!result.ok) setError(tErr(result.error ?? "saveFailed"));
    });
  };

  const equipmentText = (info?: LibraryExercise) =>
    info?.equipment.length ? info.equipment.map((e) => e.name).join(" · ") : t("bodyweight");

  const date = new Date(`${session.date}T00:00:00Z`);
  const StatusIcon = STATUS_ICON[session.status];
  const style = DAY_TYPE_STYLE[session.dayType];
  const sheetBlock = sheet?.t === "block" ? blocks.find((b) => b.id === sheet.blockId) : undefined;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-bg">
      <div className="flex h-[52px] flex-none items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)]">
        <Link
          href={`/week?start=${weekStart(session.date)}`}
          aria-label={t("back")}
          className="flex size-11 items-center justify-center rounded-xl text-text"
        >
          <ChevronLeft className="size-[26px]" />
        </Link>
        {planned && (
          <button
            type="button"
            onClick={() => setSheet({ t: "day" })}
            disabled={busy || regenerating !== null}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-3.5 text-[15px] font-semibold text-text"
          >
            {blocks.length ? <RefreshCw className="size-[18px]" aria-hidden /> : <Sparkles className="size-[18px]" aria-hidden />}
            {blocks.length ? t("ai.regenerateDay") : t("ai.generateDay")}
          </button>
        )}
      </div>

      <main className={cn("flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-2 pb-6", busy && "opacity-70")}>
        <header className="flex flex-none flex-col gap-2.5 px-1 pb-1">
          <span className={cn("flex min-h-[30px] items-center gap-2 self-start rounded-full px-3 text-[13px] font-bold", style.tint)}>
            <span className={cn("size-2 rounded-full", style.dot)} />
            {tTypes(`long.${session.dayType}`)}
          </span>
          <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.02em]">
            {format.dateTime(date, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}
          </h1>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] text-text-2">
              {t("summary", { count: exerciseCount(blocks), minutes: estimateMinutes(blocks) })}
            </span>
            <span
              className={cn(
                "flex min-h-[30px] items-center gap-1.5 rounded-full pr-3 pl-2.5 text-[13px] font-bold",
                session.status === "done" && "bg-done-tint text-done-text",
                session.status === "skipped" && "bg-skip-tint text-skip-text",
                session.status === "planned" && "border-[1.5px] border-line-strong text-text-2",
              )}
            >
              <StatusIcon className="size-[15px]" aria-hidden />
              {t(`status.${session.status}`)}
            </span>
          </div>
        </header>

        <FieldError message={error} />

        {blocks.length === 0 && (
          <p className="px-3 py-8 text-center text-[15px] leading-[1.45] text-text-2">{t("empty")}</p>
        )}

        {blocks.map((block, bi) => {
          const kind = kinds[bi];
          const isFinisher = block.role === "finisher";
          const perRound = block.kind === "circuit";
          const setCount = Math.max(0, ...block.exercises.map((e) => e.sets.length));
          const rest = block.restSec ?? 0;
          const tagOf = (i: number) => (kind.letter ? `${kind.letter}${i + 1}` : undefined);
          const meta = perRound
            ? t("meta.rounds", { rounds: block.rounds ?? 1, rest })
            : block.kind === "superset"
              ? t("meta.superset", { sets: setCount, rest, tag: tagOf(block.exercises.length - 1) ?? "" })
              : t("meta.sets", { sets: setCount, rest });
          const BlockIcon = isFinisher ? Target : block.kind === "superset" ? Link2 : Repeat;
          const sameRole = (j: number) => blocks[j] && blocks[j].role === block.role;

          return (
            <section
              key={block.id}
              aria-label={labels[bi]}
              className={cn(
                "flex flex-none flex-col rounded-[22px]",
                isFinisher
                  ? "border-[1.5px] border-dashed border-line-strong bg-surface-2"
                  : "border border-line bg-surface-1",
              )}
            >
              {(block.kind !== "single" || isFinisher) && (
                <div className="flex flex-col gap-1 px-4 pt-4 pb-0.5">
                  <div className="flex items-center gap-2">
                    <BlockIcon className="size-[18px] text-text-2" aria-hidden />
                    <h2 className="text-lg font-extrabold">{labels[bi]}</h2>
                    {isFinisher && (
                      <span className="ml-auto flex min-h-[26px] items-center rounded-full bg-text px-2.5 text-xs font-extrabold tracking-[0.06em] text-bg">
                        {t("blocks.finisherBadge")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSheet({ t: "block", blockId: block.id })}
                    className="self-start text-left text-sm font-semibold text-text-2 underline decoration-line-strong decoration-dotted underline-offset-4"
                  >
                    {meta}
                  </button>
                </div>
              )}

              {block.exercises.map((item, i) => {
                const info = byId.get(item.exerciseId);
                const alone = block.exercises.length === 1;
                const canUp = alone ? sameRole(bi - 1) : i > 0;
                const canDown = alone ? sameRole(bi + 1) : i < block.exercises.length - 1;
                const sub =
                  block.kind === "single" && !isFinisher
                    ? t("meta.sets", { sets: item.sets.length, rest })
                    : [
                        equipmentText(info),
                        item.perSide && t("perSide"),
                        item.measure === "seconds" && t("hold"),
                      ]
                        .filter(Boolean)
                        .join(" · ");

                return (
                  <ExerciseRow
                    key={item.id}
                    item={item}
                    info={info}
                    tag={tagOf(i)}
                    sub={sub}
                    showThen={block.kind === "superset" && i > 0}
                    divider={i > 0}
                    perRound={perRound}
                    busy={busy || (regenerating !== null && regenerating !== item.id)}
                    regenerating={regenerating === item.id}
                    actions={{
                      openInfo: () => setSheet({ t: "info", exerciseId: item.exerciseId }),
                      openSwap: () => setSheet({ t: "swap", item }),
                      regenerate: planned ? () => regenerateExercise(item.id) : undefined,
                      editSet: (index) => setSheet({ t: "set", item, index, perRound }),
                      addSet: () => run(() => addSet(item.id)),
                      moveUp: canUp ? () => run(() => moveExercise(item.id, -1)) : undefined,
                      moveDown: canDown ? () => run(() => moveExercise(item.id, 1)) : undefined,
                      editRest: () => setSheet({ t: "block", blockId: block.id }),
                      remove: () => run(() => deleteExercise(item.id)),
                    }}
                  />
                );
              })}
            </section>
          );
        })}

        <button
          type="button"
          onClick={() => setSheet({ t: "add" })}
          disabled={busy}
          className="flex min-h-14 flex-none items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-line-strong text-base font-semibold text-text"
        >
          <Plus className="size-5" aria-hidden />
          {t("addExercise")}
        </button>
      </main>

      {blocks.length > 0 && (
        <footer className="flex-none border-t border-line bg-bg px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
          <Link
            href={`/session/${session.id}/log`}
            className="flex min-h-16 items-center justify-center gap-2.5 rounded-[18px] bg-brand text-[17px] font-bold text-on-brand active:scale-[.98] active:bg-brand-press"
          >
            <ClipboardCheck className="size-5" aria-hidden />
            {planned ? t("logResults") : t("editResults")}
          </Link>
        </footer>
      )}

      {sheet?.t === "set" && (
        <SetEditorSheet
          exercise={sheet.item}
          name={byId.get(sheet.item.exerciseId)?.name ?? t("unknownExercise")}
          setIndex={sheet.index}
          perRound={sheet.perRound}
          onClose={close}
        />
      )}
      {sheet?.t === "swap" && (
        <SwapSheet
          item={sheet.item}
          current={byId.get(sheet.item.exerciseId)}
          library={library}
          aiEnabled={planned}
          onClose={close}
        />
      )}
      {sheet?.t === "day" && <RegenerateDaySheet sessionId={session.id} empty={blocks.length === 0} onClose={close} />}
      {sheet?.t === "info" && byId.get(sheet.exerciseId) && (
        <ExerciseInfoSheet exercise={byId.get(sheet.exerciseId)!} dayType={session.dayType} onClose={close} />
      )}
      {sheetBlock && (
        <BlockSheet block={sheetBlock} title={labels[blocks.indexOf(sheetBlock)]} onClose={close} />
      )}
      {sheet?.t === "add" && (
        <AddExerciseSheet
          sessionId={session.id}
          dayType={session.dayType}
          blocks={blocks}
          labels={labels}
          library={library}
          onClose={close}
        />
      )}
    </div>
  );
}
