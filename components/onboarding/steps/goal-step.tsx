"use client";

import { useTranslations } from "next-intl";
import { BicepsFlexed, Dumbbell, Flame, HeartPulse, type LucideIcon } from "lucide-react";
import { GOALS } from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";
import { FieldError, RadioCard, StepIntro } from "../controls";
import type { StepProps } from "../types";

const GOAL_STYLE: Record<(typeof GOALS)[number], { icon: LucideIcon; tint: string }> = {
  strength: { icon: Dumbbell, tint: "bg-upper-tint text-upper-text" },
  muscle: { icon: BicepsFlexed, tint: "bg-lower-tint text-lower-text" },
  fat: { icon: Flame, tint: "bg-func-tint text-func-text" },
  general: { icon: HeartPulse, tint: "bg-brand-tint text-brand-text" },
};

export function GoalStep({ draft, update, errors, errorText }: StepProps) {
  const t = useTranslations("Onboarding.goal");

  return (
    <>
      <StepIntro title={t("title")} sub={t("sub")} />
      <div role="radiogroup" aria-label={t("title")} className="flex flex-col gap-3">
        {GOALS.map((goal) => {
          const { icon: Icon, tint } = GOAL_STYLE[goal];
          return (
            <RadioCard
              key={goal}
              large
              on={draft.goal === goal}
              onClick={() => update({ goal })}
              title={t(`options.${goal}.label`)}
              hint={t(`options.${goal}.hint`)}
              icon={
                <span className={cn("flex size-14 flex-none items-center justify-center rounded-2xl", tint)}>
                  <Icon className="size-7" aria-hidden />
                </span>
              }
            />
          );
        })}
      </div>
      <FieldError message={errorText(errors.goal)} />
    </>
  );
}
