import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-none flex-col border-b border-line px-5 pt-[max(16px,env(safe-area-inset-top))]",
        subtitle ? "gap-1.5 pb-3.5" : "gap-3.5 pb-3",
      )}
    >
      <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">{title}</h1>
      {subtitle && <p className="text-[15px] leading-[1.45] text-text-2">{subtitle}</p>}
      {children}
    </header>
  );
}
