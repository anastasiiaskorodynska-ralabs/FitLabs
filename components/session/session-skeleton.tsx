import { Skeleton } from "@/components/skeleton";

// Placeholder for the session and log screens: header plus a few blocks.
export function SessionSkeleton() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-bg">
      <div className="flex h-[52px] flex-none items-center justify-between px-3 pt-[env(safe-area-inset-top)]">
        <Skeleton className="size-11" />
        <Skeleton className="h-11 w-44" />
      </div>
      <div className="flex flex-col gap-3.5 px-4 pt-2">
        <div className="flex flex-col gap-2.5 px-1 pb-1">
          <Skeleton className="h-[30px] w-28 rounded-full" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface-1 p-3.5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-[52px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
