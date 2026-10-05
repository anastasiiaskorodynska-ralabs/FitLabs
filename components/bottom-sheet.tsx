"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Bottom sheet from the design system: 28px top radius, grabber, close via ×,
// scrim tap or Escape, primary action last. `tall` fills the screen below the
// status bar and scrolls its body.
export function BottomSheet({
  open,
  onClose,
  title,
  eyebrow,
  tall,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string; // small line above the title, e.g. "Set 2 of 3"
  tall?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("Common");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim"
    >
      {open && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col rounded-t-[28px] bg-surface-1 text-text shadow-sheet",
            "animate-in duration-240 ease-out slide-in-from-bottom",
            tall ? "top-[max(16px,env(safe-area-inset-top))]" : "max-h-[calc(100dvh-16px)]",
          )}
        >
          <div className="flex flex-none flex-col gap-3 px-5 pt-2.5 pb-1">
            <span className="h-[5px] w-10 self-center rounded-full bg-line-strong" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1 pt-1">
                {eyebrow && <span className="text-[13px] font-semibold text-text-2">{eyebrow}</span>}
                <h2
                  className={cn(
                    "font-extrabold tracking-[-0.01em]",
                    eyebrow ? "text-[22px] leading-[1.2] font-bold" : "text-2xl",
                  )}
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="flex size-11 flex-none items-center justify-center rounded-xl bg-surface-2 text-text-2"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-3 pb-4">
            {children}
          </div>
          {footer && (
            <div className="flex flex-none flex-col gap-2 border-t border-line px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export function PrimaryButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex min-h-16 w-full items-center justify-center gap-2 rounded-[18px] bg-brand text-[17px] font-bold text-on-brand active:scale-[.98] active:bg-brand-press disabled:bg-surface-2 disabled:text-text-3",
        className,
      )}
    />
  );
}
