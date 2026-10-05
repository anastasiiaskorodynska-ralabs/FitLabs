import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { isOnboarded, requireUser } from "@/lib/auth";

// Placeholder until the onboarding flow from /design is built.
export default async function OnboardingPage() {
  await requireUser();
  if (await isOnboarded()) redirect("/week");
  const t = await getTranslations("Onboarding");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg">
      <PageHeader title={t("title")} />
      <div className="flex flex-col gap-6 px-5 py-6">
        <p className="text-[17px] leading-[1.45] text-text-2">{t("comingSoon")}</p>
        <SignOutButton />
      </div>
    </div>
  );
}
