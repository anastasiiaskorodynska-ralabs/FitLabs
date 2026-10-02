import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function WeekPage() {
  const t = await getTranslations("Tabs");
  return <PageHeader title={t("week")} />;
}
