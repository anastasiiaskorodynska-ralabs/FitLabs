import { getTranslations } from "next-intl/server";
import { LoadingRegion, Skeleton } from "@/components/skeleton";

export default async function ExamplesLoading() {
  const t = await getTranslations("Status");
  return (
    <LoadingRegion label={t("loading")} className="flex flex-1 flex-col">
      <div className="flex flex-none flex-col gap-2 border-b border-line px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3.5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex flex-col gap-3 px-5 pt-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-surface-1 p-4">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-[72px] rounded-xl" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
