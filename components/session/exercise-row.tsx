"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  EllipsisVertical,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";
import { formatKg, setMode } from "@/lib/sessions/format";
import type { LibraryExercise, SessionExercise, SetRow } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";
import { ExerciseThumb } from "./exercise-thumb";

export type RowActions = {
  openInfo: () => void;
  openSwap: () => void;
  editSet: (index: number) => void;
  addSet: () => void;
  moveUp?: () => void; // undefined = can't move that way
  moveDown?: () => void;
  editRest: () => void;
  remove: () => void;
};

function ValueButton({
  value,
  unit,
  onClick,
  label,
}: {
  value: string;
  unit: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex min-h-12 items-baseline gap-1 rounded-xl bg-surface-2 px-3 text-left leading-[48px] text-text"
    >
      <span className="text-[22px] font-extrabold">{value}</span>
      {unit && <span className="text-xs font-semibold text-text-2">{unit}</span>}
    </button>
  );
}

export function ExerciseRow({
  item,
  info,
  tag,
  sub,
  showThen,
  divider,
  perRound,
  busy,
  actions,
}: {
  item: SessionExercise;
  info: LibraryExercise | undefined;
  tag?: string;
  sub: string;
  showThen: boolean;
  divider: boolean;
  perRound: boolean; // circuit: one target per round instead of set rows
  busy: boolean;
  actions: RowActions;
}) {
  const t = useTranslations("Session");
  const [menuOpen, setMenuOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = info?.name ?? t("unknownExercise");

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const kgText = (s: SetRow) => (s.kg === null ? t("bw") : formatKg(s.kg));
  const kgUnit = (s: SetRow) => (s.kg === null ? "" : t("units.kg"));
  const amountText = (s: SetRow) => {
    const mode = setMode(item.measure, item.perSide, s);
    return mode === "max" ? t("max") : String(mode === "time" ? s.seconds : s.reps);
  };
  const amountUnit = (s: SetRow) => {
    const mode = setMode(item.measure, item.perSide, s);
    return mode === "time" ? t("units.sec") : mode === "side" ? t("units.side") : "";
  };

  const menuItem = "flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold disabled:text-text-3";
  const run = (fn?: () => void) => () => {
    setMenuOpen(false);
    fn?.();
  };

  return (
    <div className={cn("relative flex flex-col gap-3 p-3.5", divider && "border-t border-line")}>
      {showThen && (
        <div className="-mt-1.5 -mb-0.5 flex items-center gap-1.5 text-xs font-bold text-text-3">
          <ArrowDown className="size-3.5" aria-hidden />
          {t("thenInto")}
        </div>
      )}

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={actions.openInfo}
          aria-label={t("infoFor", { name })}
          className="relative flex-none rounded-xl"
        >
          <ExerciseThumb src={info?.images[0]} />
          {tag && (
            <span className="absolute -top-1.5 -left-1.5 flex h-[22px] min-w-6 items-center justify-center rounded-lg bg-text px-[5px] text-[11px] font-extrabold text-bg">
              {tag}
            </span>
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] pt-0.5">
          <span className="text-[17px] leading-[1.25] font-bold text-pretty">{name}</span>
          <span className="text-[13px] leading-[1.3] text-text-2">{sub}</span>
        </div>
        <div className="-mt-1 -mr-1.5 flex flex-none">
          <button
            type="button"
            onClick={actions.openSwap}
            disabled={busy}
            aria-label={t("swapNamed", { name })}
            className="flex h-11 w-10 items-center justify-center rounded-xl text-text-2"
          >
            <ArrowLeftRight className="size-[19px]" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={busy}
              aria-label={t("moreFor", { name })}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={cn(
                "flex h-11 w-10 items-center justify-center rounded-xl text-text-2",
                menuOpen && "bg-surface-3",
              )}
            >
              <EllipsisVertical className="size-[19px]" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute top-12 right-0 z-10 flex w-[210px] flex-col rounded-2xl border border-line-strong bg-surface-1 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,.35)]"
              >
                <button role="menuitem" type="button" disabled={!actions.moveUp} onClick={run(actions.moveUp)} className={menuItem}>
                  <ArrowUp className="size-[18px]" aria-hidden />
                  {t("menu.moveUp")}
                </button>
                <button role="menuitem" type="button" disabled={!actions.moveDown} onClick={run(actions.moveDown)} className={menuItem}>
                  <ArrowDown className="size-[18px]" aria-hidden />
                  {t("menu.moveDown")}
                </button>
                <button role="menuitem" type="button" onClick={run(actions.editRest)} className={menuItem}>
                  <Timer className="size-[18px]" aria-hidden />
                  {t("menu.rest")}
                </button>
                <div className="mx-1.5 my-1 h-px bg-line" />
                <button role="menuitem" type="button" onClick={run(actions.remove)} className={cn(menuItem, "text-danger")}>
                  <Trash2 className="size-[18px]" aria-hidden />
                  {t("menu.delete")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {perRound ? (
        <>
          <div className="flex items-center gap-2">
            {item.sets[0].kg !== null && (
              <>
                <ValueButton
                  value={kgText(item.sets[0])}
                  unit={kgUnit(item.sets[0])}
                  onClick={() => actions.editSet(0)}
                  label={t("editTarget", { name })}
                />
                <span className="text-[17px] font-bold text-text-3">×</span>
              </>
            )}
            <ValueButton
              value={amountText(item.sets[0])}
              unit={amountUnit(item.sets[0])}
              onClick={() => actions.editSet(0)}
              label={t("editTarget", { name })}
            />
            {info && info.technique.length > 0 && (
              <button
                type="button"
                onClick={() => setTechOpen((v) => !v)}
                aria-expanded={techOpen}
                className="ml-auto flex min-h-11 items-center gap-1 rounded-xl pr-2 pl-3 text-sm font-semibold text-text-2"
              >
                {t("technique")}
                {techOpen ? <ChevronUp className="size-[18px]" /> : <ChevronDown className="size-[18px]" />}
              </button>
            )}
          </div>
          {techOpen && info && (
            <ol className="flex list-decimal flex-col gap-1.5 rounded-[14px] bg-surface-2 py-3 pr-3.5 pl-[34px] text-[15px] leading-[1.45] text-text-2">
              {info.technique.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[32px_1fr_1fr] gap-2 px-0.5 text-[11px] font-bold tracking-[0.06em] text-text-3 uppercase">
            <span>{t("cols.set")}</span>
            <span>{t("cols.kg")}</span>
            <span>{item.measure === "seconds" ? t("cols.sec") : t("cols.reps")}</span>
          </div>
          {item.sets.map((s, i) => (
            <div key={s.id} className="grid grid-cols-[32px_1fr_1fr] items-center gap-2">
              <span className="pl-1 text-[15px] font-bold text-text-3">{i + 1}</span>
              <ValueButton
                value={kgText(s)}
                unit={kgUnit(s)}
                onClick={() => actions.editSet(i)}
                label={t("editSet", { n: i + 1, name })}
              />
              <ValueButton
                value={amountText(s)}
                unit={amountUnit(s)}
                onClick={() => actions.editSet(i)}
                label={t("editSet", { n: i + 1, name })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={actions.addSet}
            disabled={busy || item.sets.length >= 20}
            className="flex min-h-11 items-center gap-1.5 self-start rounded-xl px-1 text-sm font-semibold text-brand-text disabled:text-text-3"
          >
            <Plus className="size-4" aria-hidden />
            {t("addSet")}
          </button>
        </div>
      )}
    </div>
  );
}
