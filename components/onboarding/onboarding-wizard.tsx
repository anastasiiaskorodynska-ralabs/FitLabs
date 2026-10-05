"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { completeOnboarding } from "@/app/onboarding/actions";
import {
  STEPS,
  stepErrors,
  type FieldErrors,
  type OnboardingDraft,
} from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";
import { FieldError } from "./controls";
import { AboutStep } from "./steps/about-step";
import { EquipmentStep } from "./steps/equipment-step";
import { ExamplesStep } from "./steps/examples-step";
import { GoalStep } from "./steps/goal-step";
import { RulesStep } from "./steps/rules-step";
import { ScheduleStep } from "./steps/schedule-step";
import type { EquipmentItem, StepProps } from "./types";

const LAST = STEPS.length - 1;

export function OnboardingWizard({
  initial,
  equipment,
}: {
  initial: OnboardingDraft;
  equipment: EquipmentItem[];
}) {
  const t = useTranslations("Onboarding");
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (Object.keys(errors).length) setErrors({});
  };

  const errorText: StepProps["errorText"] = (key, values) => {
    if (!key) return undefined;
    const path = `errors.${key}`;
    return t.has(path) ? t(path, values) : t("errors.invalid");
  };

  const goTo = (index: number) => {
    setErrors({});
    setStep(index);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const finish = (data: OnboardingDraft) => {
    setSaveError(undefined);
    startSaving(async () => {
      // Only returns on failure; success redirects to /week.
      const result = await completeOnboarding(data);
      setSaveError(t(`errors.${result.error}`));
    });
  };

  const next = () => {
    const found = stepErrors(step, draft);
    if (found) {
      setErrors(found);
      return;
    }
    if (step === LAST) finish(draft);
    else goTo(step + 1);
  };

  const props: StepProps = { draft, update, errors, errorText };
  const stepKey = STEPS[step].key;

  const headerExtra =
    stepKey === "schedule" ? (
      <span className="text-[15px] font-bold text-brand-text">
        {t("schedule.daysPerWeek", { count: draft.days.length })}
      </span>
    ) : stepKey === "equipment" ? (
      <span className="text-[15px] font-bold text-brand-text">
        {t("equipment.selected", { count: draft.equipmentIds.length + draft.custom.length })}
      </span>
    ) : stepKey === "examples" ? (
      <button
        type="button"
        disabled={saving}
        onClick={() => finish({ ...draft, example: "" })}
        className="min-h-11 px-1 text-[15px] font-semibold text-brand-text"
      >
        {t("skip")}
      </button>
    ) : null;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-bg">
      <header className="flex flex-none flex-col gap-3 px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex h-11 items-center justify-between">
          <span className="text-[15px] font-bold text-text-2">
            {t("progress", { step: step + 1, total: STEPS.length })}
            {stepKey === "examples" && ` · ${t("optional")}`}
          </span>
          {headerExtra}
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label={t("progressLabel")}
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}
        >
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={cn("h-1.5 rounded-[3px]", i <= step ? "bg-brand" : "bg-surface-3")}
            />
          ))}
        </div>
      </header>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
        {stepKey === "about" && <AboutStep {...props} />}
        {stepKey === "goal" && <GoalStep {...props} />}
        {stepKey === "schedule" && <ScheduleStep {...props} />}
        {stepKey === "rules" && <RulesStep {...props} />}
        {stepKey === "equipment" && <EquipmentStep {...props} equipment={equipment} />}
        {stepKey === "examples" && <ExamplesStep {...props} />}
        <FieldError message={saveError} />
      </div>

      <footer className="flex flex-none gap-3 border-t border-line bg-bg px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        {step > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={() => goTo(step - 1)}
            className="min-h-16 rounded-[18px] bg-surface-3 px-6 text-[17px] font-semibold text-text"
          >
            {t("back")}
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={next}
          className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-[18px] bg-brand text-[17px] font-bold text-on-brand active:scale-[.98] active:bg-brand-press disabled:opacity-60"
        >
          {step === LAST ? (
            <>
              <Sparkles className="size-5" aria-hidden />
              {saving ? t("saving") : t("finish")}
            </>
          ) : (
            <>
              {t("next")}
              <ArrowRight className="size-5" aria-hidden />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
