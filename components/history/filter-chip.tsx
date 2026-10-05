import { cn } from "@/lib/utils";

// Filter chip from the design: inverted when active, optional colour dot.
export function FilterChip({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string; // bg-* class
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 flex-none items-center gap-2 rounded-full border-[1.5px] px-4 text-[15px] font-semibold",
        active ? "border-text bg-text text-bg" : "border-line-strong text-text",
      )}
    >
      {dot && <span className={cn("size-2 rounded-full", dot)} aria-hidden />}
      {children}
    </button>
  );
}
