import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { isOnboarded, requireUser } from "@/lib/auth";
import { loadProfileDraft } from "@/lib/profile/data";

export default async function OnboardingPage() {
  const { supabase } = await requireUser();
  if (await isOnboarded()) redirect("/week");

  const { draft, equipment } = await loadProfileDraft(supabase, await getLocale());
  return <OnboardingWizard initial={draft} equipment={equipment} />;
}
