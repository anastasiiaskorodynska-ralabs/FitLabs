import type { LucideIcon } from "lucide-react";

// Full-screen message used by the error, not-found and offline pages.
export function StatusScreen({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center gap-7 bg-bg px-5 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-[72px] items-center justify-center rounded-3xl bg-brand-tint text-brand-text">
          <Icon className="size-8" aria-hidden />
        </span>
        <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em] text-balance">{title}</h1>
        <p className="text-base leading-[1.45] text-text-2 text-pretty">{body}</p>
      </div>
      {children && <div className="flex flex-col gap-3">{children}</div>}
    </main>
  );
}

export const primaryLinkClass =
  "flex min-h-16 items-center justify-center rounded-[18px] bg-brand text-[17px] font-bold text-on-brand active:scale-[.98] active:bg-brand-press";
export const secondaryLinkClass =
  "flex min-h-14 items-center justify-center rounded-2xl border-[1.5px] border-line-strong text-base font-semibold text-text";
