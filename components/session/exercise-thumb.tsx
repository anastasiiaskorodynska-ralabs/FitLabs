import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// First library image, or the striped placeholder from the design.
export function ExerciseThumb({ src, className }: { src?: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- library images may come from any host
    return <img src={src} alt="" className={cn("size-[52px] flex-none rounded-xl object-cover", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[52px] flex-none items-center justify-center rounded-xl text-text-3",
        "bg-[repeating-linear-gradient(135deg,var(--surface-3)_0_6px,var(--surface-2)_6px_12px)]",
        className,
      )}
    >
      <ImageIcon className="size-5" />
    </span>
  );
}
