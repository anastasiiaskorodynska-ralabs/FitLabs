import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function ProfilePage() {
  const t = await getTranslations("Tabs");
  return (
    <>
      <PageHeader title={t("profile")} />
      <div className="px-5 py-6">
        <SignOutButton />
      </div>
    </>
  );
}
