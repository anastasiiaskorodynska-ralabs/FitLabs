import { getTranslations } from "next-intl/server";
import { LoadingRegion, Skeleton, SkeletonCard } from "@/components/skeleton";

export default async function WeekLoading() {
  const t = await getTranslations("Status");
  return (
    <LoadingRegion label={t("loading")} className="flex flex-1 flex-col">
      <div className="flex flex-none flex-col gap-3.5 border-b border-line px-3 pt-[max(12px,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-12 rounded-[14px]" />
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="size-12 rounded-[14px]" />
        </div>
        <div className="grid grid-cols-7 gap-1 px-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-[14px]" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-5 pt-4">
        <Skeleton className="h-5 w-28" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </LoadingRegion>
  );
}
