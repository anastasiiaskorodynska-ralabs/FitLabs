"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/app/actions/locale";
import { locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations("Locale");
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "flex gap-0.5 rounded-full border border-line bg-surface-2 p-[3px]",
        pending && "opacity-70",
        className,
      )}
    >
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-pressed={active}
            disabled={pending}
            onClick={() => startTransition(() => setLocale(locale))}
            className={cn(
              "h-11 min-w-[52px] rounded-full text-sm font-bold uppercase",
              active ? "bg-text text-bg" : "text-text-2",
            )}
          >
            {t(locale)}
          </button>
        );
      })}
    </div>
  );
}
