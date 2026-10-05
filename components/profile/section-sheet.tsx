"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import type { SaveResult } from "@/app/(tabs)/profile/actions";
import { BottomSheet, PrimaryButton } from "@/components/bottom-sheet";
import { FieldError } from "@/components/onboarding/controls";
import type { StepProps } from "@/components/onboarding/types";
import { fieldErrors, type FieldErrors, type OnboardingDraft } from "@/lib/onboarding/schema";

// Edits one Profile section on a copy of the draft; saves only when valid.
export function SectionSheet({
  title,
  initial,
  schema,
  save,
  onClose,
  tall,
  children,
}: {
  title: string;
  initial: OnboardingDraft;
  schema: z.ZodType;
  save: (draft: OnboardingDraft) => Promise<SaveResult>;
  onClose: () => void;
  tall?: boolean;
  children: (props: StepProps) => React.ReactNode;
}) {
  const t = useTranslations("Onboarding");
  const tCommon = useTranslations("Common");
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const update = (patch: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  };

  const errorText: StepProps["errorText"] = (key, values) => {
    if (!key) return undefined;
    const path = `errors.${key}`;
    return t.has(path) ? t(path, values) : t("errors.invalid");
  };

  const submit = () => {
    const found = fieldErrors(schema, draft);
    if (found) {
      setErrors(found);
      return;
    }
    setSaveError(undefined);
    startSaving(async () => {
      const result = await save(draft);
      if (result.ok) onClose();
      else setSaveError(t(`errors.${result.error}`));
    });
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={title}
      tall={tall}
      footer={
        <>
          <FieldError message={saveError} />
          <PrimaryButton onClick={submit} disabled={saving}>
            {saving ? t("saving") : tCommon("save")}
          </PrimaryButton>
        </>
      }
    >
      {children({ draft, update, errors, errorText, hideIntro: true })}
    </BottomSheet>
  );
}
