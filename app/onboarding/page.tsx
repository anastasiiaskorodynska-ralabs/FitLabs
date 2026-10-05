import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { EquipmentItem } from "@/components/onboarding/types";
import { isOnboarded, requireUser } from "@/lib/auth";
import { SESSION_LENGTHS, type OnboardingDraft } from "@/lib/onboarding/schema";

export default async function OnboardingPage() {
  const { supabase } = await requireUser();
  if (await isOnboarded()) redirect("/week");
  const locale = await getLocale();

  const [{ data: profile }, { data: rules }, { data: schedule }, { data: equipment }] =
    await Promise.all([
      supabase.from("profile").select("*").eq("id", 1).single(),
      supabase.from("training_rules").select("*").eq("id", 1).single(),
      supabase.from("schedule_days").select("weekday, day_type").order("weekday"),
      supabase
        .from("equipment")
        .select("id, name_en, name_uk, category, available")
        .order("category")
        .order("position"),
    ]);

  const length = SESSION_LENGTHS.find((n) => n === profile?.session_length_min) ?? 60;

  const initial: OnboardingDraft = {
    name: profile?.display_name ?? "",
    sex: profile?.sex ?? null,
    age: profile?.birth_year ? new Date().getFullYear() - profile.birth_year : 30,
    height: profile?.height_cm ? Math.round(Number(profile.height_cm)) : 170,
    weight: profile?.weight_kg ? Math.round(Number(profile.weight_kg)) : 65,
    level: profile?.level ?? "intermediate",
    goal: profile?.goal ?? null,
    days: (schedule ?? []).map((d) => ({ weekday: d.weekday, dayType: d.day_type })),
    sessionLength: length,
    noWarmup: rules?.no_warmup ?? false,
    absFinisher: rules?.abs_finisher ?? false,
    avoid: rules?.avoid_terms ?? [],
    notes: rules?.notes ?? "",
    equipmentIds: (equipment ?? []).filter((e) => e.available).map((e) => e.id),
    custom: [],
    example: "",
  };

  const items: EquipmentItem[] = (equipment ?? []).map((e) => ({
    id: e.id,
    name: locale === "uk" ? e.name_uk : e.name_en,
    category: e.category,
  }));

  return <OnboardingWizard initial={initial} equipment={items} />;
}
