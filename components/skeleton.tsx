import { cn } from "@/lib/utils";

// Pulsing placeholder used by the loading.tsx files.
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-xl bg-surface-2", className)} />;
}

// A card-shaped row: tile, two text lines, badge (Week, History).
export function SkeletonCard() {
  return (
    <div className="flex flex-none items-center gap-3.5 rounded-[20px] border border-line bg-surface-1 p-3.5">
      <Skeleton className="size-14 rounded-[14px]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <Skeleton className="h-[30px] w-20 rounded-full" />
    </div>
  );
}

// Wraps a skeleton so screen readers announce loading once.
export function LoadingRegion({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-label={label} aria-busy className={className}>
      {children}
    </div>
  );
}
