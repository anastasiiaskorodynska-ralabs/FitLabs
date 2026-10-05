import type { LucideIcon } from "lucide-react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionLine = { text: string; dot?: string };

export function ProfileSection({
  icon: Icon,
  title,
  lines,
  editLabel,
  onEdit,
}: {
  icon: LucideIcon;
  title: string;
  lines: SectionLine[];
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <section className="flex flex-none flex-col gap-2.5 rounded-[20px] border border-line bg-surface-1 pt-3.5 pr-2 pb-4 pl-4">
      <div className="flex items-center gap-2.5">
        <Icon className="size-[19px] text-text-2" aria-hidden />
        <h2 className="min-w-0 flex-1 text-[17px] font-bold">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${editLabel}: ${title}`}
          className="flex min-h-11 items-center gap-1.5 rounded-xl bg-surface-2 px-3 text-sm font-semibold text-text"
        >
          <Pencil className="size-[15px]" aria-hidden />
          {editLabel}
        </button>
      </div>
      <ul className="flex flex-col gap-1.5 pr-2">
        {lines.map((line, i) => (
          <li key={i} className="flex items-center gap-2 text-[15px] leading-[1.4] text-text-2">
            <span className={cn("size-2 flex-none rounded-full", line.dot ?? "bg-transparent")} />
            <span className="min-w-0 flex-1">{line.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
