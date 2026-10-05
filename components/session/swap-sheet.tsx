"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoaderCircle, Sparkles } from "lucide-react";
import { applyAiOption } from "@/app/session/ai-actions";
import { swapExercise } from "@/app/session/actions";
import { BottomSheet } from "@/components/bottom-sheet";
import { FieldError, inputClass } from "@/components/onboarding/controls";
import type { AiBlockExercise } from "@/lib/ai/schemas";
import type { LibraryExercise, SessionExercise } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";
import { postAi } from "./ai-request";
import { ExercisePicker } from "./exercise-picker";
import { ExerciseThumb } from "./exercise-thumb";

type Suggestion = {
  why: string;
  exerciseId: string | null;
  name: string;
  muscles: string[];
  isNew: boolean;
  exercise: AiBlockExercise;
};

// Manual swap (same muscles first) plus "Suggest with AI" with an optional reason.
export function SwapSheet({
  item,
  current,
  library,
  aiEnabled,
  onClose,
}: {
  item: SessionExercise;
  current: LibraryExercise | undefined;
  library: LibraryExercise[];
  aiEnabled: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Session");
  const tAi = useTranslations("Session.ai");
  const tErr = useTranslations("Session.errors");
  const tM = useTranslations("Muscles");
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const [reason, setReason] = useState("");
  const [thinking, setThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const images = new Map(library.map((e) => [e.id, e.images[0]]));

  const rank = (e: LibraryExercise) => {
    if (!current) return 0;
    const shared = e.muscles.filter((m) => current.muscles.includes(m)).length;
    return shared * 2 + (e.measure === current.measure ? 1 : 0) + (e.isAbs === current.isAbs ? 1 : 0);
  };

  const pick = (e: LibraryExercise) => {
    setError(undefined);
    startSaving(async () => {
      const result = await swapExercise(item.id, e.id);
      if (result.ok) onClose();
      else setError(tErr(result.error));
    });
  };

  const suggest = async () => {
    setError(undefined);
    setThinking(true);
    const result = await postAi<{ options: Suggestion[] }>("/api/regenerate-exercise", {
      blockExerciseId: item.id,
      mode: "suggest",
      reason: reason.trim() || undefined,
    });
    setThinking(false);
    if (result.ok) setSuggestions(result.data.options);
    else setError(tAi.has(`errors.${result.code}`) ? tAi(`errors.${result.code}`) : tAi("errors.failed"));
  };

  const apply = (s: Suggestion) => {
    setError(undefined);
    startSaving(async () => {
      const result = await applyAiOption({ blockExerciseId: item.id, exercise: s.exercise });
      if (result.ok) {
        router.refresh();
        onClose();
      } else setError(tAi(`errors.${result.error}`));
    });
  };

  return (
    <BottomSheet
      open
      tall
      onClose={onClose}
      eyebrow={t("swap")}
      title={current?.name ?? t("unknownExercise")}
      footer={
        aiEnabled && (
          <>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              disabled={thinking}
              placeholder={tAi("reasonPlaceholder")}
              aria-label={tAi("reason")}
              className={cn(inputClass, "h-[52px] px-3.5 text-base")}
            />
            <button
              type="button"
              onClick={suggest}
              disabled={thinking || saving}
              className="flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-surface-3 text-base font-bold text-text disabled:opacity-60"
            >
              {thinking ? (
                <LoaderCircle className="size-5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-5 text-brand-text" aria-hidden />
              )}
              {thinking ? tAi("thinking") : tAi("suggest")}
            </button>
          </>
        )
      }
    >
      <FieldError message={error} />

      {suggestions && suggestions.length > 0 && (
        <section className="flex flex-none flex-col gap-2" aria-label={tAi("suggested")}>
          <h3 className="flex items-center gap-1.5 px-0.5 pt-1 text-[13px] font-bold text-brand-text">
            <Sparkles className="size-[15px]" aria-hidden />
            {tAi("suggested")}
          </h3>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => apply(s)}
              disabled={saving}
              className="flex min-h-[72px] items-center gap-3 rounded-2xl border-[1.5px] border-brand bg-brand-tint p-2.5 text-left text-text disabled:opacity-60"
            >
              <ExerciseThumb src={s.exerciseId ? images.get(s.exerciseId) : undefined} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-base font-bold">
                  {s.name}
                  {s.isNew && <span className="ml-1.5 text-xs font-semibold text-brand-text">{tAi("new")}</span>}
                </span>
                <span className="text-[13px] leading-[1.3] text-text-2">{s.why}</span>
                <span className="text-xs text-text-3">{s.muscles.map((m) => (tM.has(m) ? tM(m) : m)).join(", ")}</span>
              </span>
            </button>
          ))}
          <h3 className="px-0.5 pt-2 text-[13px] font-bold text-text-3">{tAi("allMatches")}</h3>
        </section>
      )}

      <ExercisePicker library={library} excludeId={item.exerciseId} rank={rank} onPick={pick} disabled={saving} />
    </BottomSheet>
  );
}
