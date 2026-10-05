import { getTranslations } from "next-intl/server";
import { LoadingRegion, Skeleton } from "@/components/skeleton";

export default async function ProfileLoading() {
  const t = await getTranslations("Status");
  return (
    <LoadingRegion label={t("loading")} className="flex flex-col gap-3.5 px-5 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3.5 pb-1.5">
        <Skeleton className="size-15 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-11 w-20" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </LoadingRegion>
  );
}
