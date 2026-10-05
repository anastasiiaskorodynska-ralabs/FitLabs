import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { StatusScreen, primaryLinkClass } from "@/components/status-screen";

export default async function NotFound() {
  const t = await getTranslations("Status.notFound");
  return (
    <StatusScreen icon={SearchX} title={t("title")} body={t("body")}>
      <Link href="/week" className={primaryLinkClass}>
        {t("home")}
      </Link>
    </StatusScreen>
  );
}
