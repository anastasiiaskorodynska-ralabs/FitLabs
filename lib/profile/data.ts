import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EquipmentItem } from "@/components/onboarding/types";
import { SESSION_LENGTHS, type OnboardingDraft } from "@/lib/onboarding/schema";

// Loads profile, rules, schedule and equipment as the editable draft used by
// onboarding and the Profile screen.
export async function loadProfileDraft(supabase: SupabaseClient, locale: string) {
  const [{ data: profile }, { data: rules }, { data: schedule }, { data: equipment }] =
    await Promise.all([
      supabase.from("profile").select("*").eq("id", 1).single(),
      supabase.from("training_rules").select("*").eq("id", 1).single(),
      supabase.from("schedule_days").select("weekday, day_type").order("weekday"),
      supabase
        .from("equipment")
        .select("id, name_en, name_uk, category, available")
        .order("category")
        .order("position")
        .order("name_en"),
    ]);

  const draft: OnboardingDraft = {
    name: profile?.display_name ?? "",
    sex: profile?.sex ?? null,
    age: profile?.birth_year ? new Date().getFullYear() - profile.birth_year : 30,
    height: profile?.height_cm ? Math.round(Number(profile.height_cm)) : 170,
    weight: profile?.weight_kg ? Math.round(Number(profile.weight_kg)) : 65,
    level: profile?.level ?? "intermediate",
    goal: profile?.goal ?? null,
    days: (schedule ?? []).map((d) => ({ weekday: d.weekday, dayType: d.day_type })),
    sessionLength: SESSION_LENGTHS.find((n) => n === profile?.session_length_min) ?? 60,
    rules: rules?.rules ?? [],
    avoid: rules?.avoid_terms ?? [],
    equipmentIds: (equipment ?? []).filter((e) => e.available).map((e) => e.id),
    custom: [],
    example: "",
  };

  const items: EquipmentItem[] = (equipment ?? []).map((e) => ({
    id: e.id,
    name: locale === "uk" ? e.name_uk : e.name_en,
    category: e.category,
  }));

  return { draft, equipment: items };
}
