import type { FieldErrors, OnboardingDraft } from "@/lib/onboarding/schema";

export type EquipmentCategory = "free_weights" | "machines" | "cables" | "accessories" | "cardio";

export type EquipmentItem = {
  id: string;
  name: string; // already in the current locale
  category: EquipmentCategory;
};

export type StepProps = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  errors: FieldErrors;
  // Translates an error key from Onboarding.errors.
  errorText: (key: string | undefined, values?: Record<string, number>) => string | undefined;
  // Hide the step heading (Profile sheets have their own title).
  hideIntro?: boolean;
};
