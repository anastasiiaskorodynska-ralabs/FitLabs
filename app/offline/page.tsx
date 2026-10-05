import { getTranslations } from "next-intl/server";
import { WifiOff } from "lucide-react";
import { StatusScreen, primaryLinkClass } from "@/components/status-screen";

// Shown by the service worker when a page isn't cached and there's no connection.
export default async function OfflinePage() {
  const t = await getTranslations("Status.offline");
  return (
    <StatusScreen icon={WifiOff} title={t("title")} body={t("body")}>
      <a href="/week" className={primaryLinkClass}>
        {t("retry")}
      </a>
    </StatusScreen>
  );
}
