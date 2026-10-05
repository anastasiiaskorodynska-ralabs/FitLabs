import { getTranslations } from "next-intl/server";
import { LoadingRegion, Skeleton, SkeletonCard } from "@/components/skeleton";

export default async function HistoryLoading() {
  const t = await getTranslations("Status");
  return (
    <LoadingRegion label={t("loading")} className="flex flex-1 flex-col">
      <div className="flex flex-none flex-col gap-3.5 border-b border-line px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-[52px] rounded-2xl" />
        <div className="flex gap-2">
          {["w-16", "w-20", "w-20", "w-24"].map((w, i) => (
            <Skeleton key={i} className={`h-11 rounded-full ${w}`} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-5 pt-4">
        <Skeleton className="h-4 w-32" />
        <SkeletonCard />
        <SkeletonCard />
        <Skeleton className="mt-3 h-4 w-32" />
        <SkeletonCard />
      </div>
    </LoadingRegion>
  );
}
