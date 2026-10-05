"use client";

import { useTranslations } from "next-intl";
import { LEVELS, LIMITS, SEXES } from "@/lib/onboarding/schema";
import {
  FieldError,
  FieldLabel,
  NumberStepper,
  RadioCard,
  Segmented,
  StepIntro,
  inputClass,
} from "../controls";
import type { StepProps } from "../types";

const BODY = [
  { field: "age", unit: "y" },
  { field: "height", unit: "cm" },
  { field: "weight", unit: "kg" },
] as const;

export function AboutStep({ draft, update, errors, errorText, hideIntro }: StepProps) {
  const t = useTranslations("Onboarding.about");
  const bodyError = BODY.map(({ field }) =>
    errors[field] ? errorText(errors[field], LIMITS[field]) : undefined,
  ).find(Boolean);

  return (
    <>
      {!hideIntro && <StepIntro title={t("title")} sub={t("sub")} />}

      <label className="flex flex-col gap-2">
        <FieldLabel>{t("name")}</FieldLabel>
        <input
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          autoComplete="given-name"
          aria-invalid={Boolean(errors.name) || undefined}
          className={inputClass}
        />
        <FieldError message={errorText(errors.name)} />
      </label>

      <div className="flex flex-col gap-2">
        <FieldLabel>{t("sex")}</FieldLabel>
        <Segmented
          label={t("sex")}
          value={draft.sex}
          onChange={(sex) => update({ sex })}
          options={SEXES.map((s) => ({ value: s, label: t(`sexes.${s}`) }))}
        />
        <FieldError message={errorText(errors.sex)} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {BODY.map(({ field, unit }) => (
            <NumberStepper
              key={field}
              label={t(field)}
              unit={t(`units.${unit}`)}
              value={draft[field]}
              min={LIMITS[field].min}
              max={LIMITS[field].max}
              onChange={(value) => update({ [field]: value })}
            />
          ))}
        </div>
        <FieldError message={bodyError} />
      </div>

      <div role="radiogroup" aria-label={t("experience")} className="flex flex-col gap-2">
        <FieldLabel>{t("experience")}</FieldLabel>
        {LEVELS.map((level) => (
          <RadioCard
            key={level}
            on={draft.level === level}
            onClick={() => update({ level })}
            title={t(`levels.${level}.label`)}
            hint={t(`levels.${level}.hint`)}
          />
        ))}
      </div>
    </>
  );
}
