"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { requireUser } from "@/lib/auth";
import { onboardingSchema } from "@/lib/onboarding/schema";

export type CompleteOnboardingResult = { error: "invalid" | "saveFailed" };

export async function completeOnboarding(input: unknown): Promise<CompleteOnboardingResult> {
  const { supabase } = await requireUser();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  const locale = await getLocale();

  const { error } = await supabase.rpc("complete_onboarding", {
    p_display_name: d.name,
    p_sex: d.sex,
    p_birth_year: new Date().getFullYear() - d.age,
    p_height_cm: d.height,
    p_weight_kg: d.weight,
    p_level: d.level,
    p_goal: d.goal,
    p_locale: isLocale(locale) ? locale : "en",
    p_session_length_min: d.sessionLength,
    p_schedule: d.days.map((day) => ({ weekday: day.weekday, day_type: day.dayType })),
    p_rules: d.rules,
    p_avoid_terms: d.avoid,
    p_equipment_ids: d.equipmentIds,
    p_custom_equipment: d.custom,
    p_example: d.example,
  });

  if (error) {
    console.error("complete_onboarding failed", error);
    return { error: "saveFailed" };
  }

  redirect("/week");
}
