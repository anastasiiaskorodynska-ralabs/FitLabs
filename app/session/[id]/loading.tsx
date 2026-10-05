import { getTranslations } from "next-intl/server";
import { SessionSkeleton } from "@/components/session/session-skeleton";
import { LoadingRegion } from "@/components/skeleton";

export default async function SessionLoading() {
  const t = await getTranslations("Status");
  return (
    <LoadingRegion label={t("loading")}>
      <SessionSkeleton />
    </LoadingRegion>
  );
}
