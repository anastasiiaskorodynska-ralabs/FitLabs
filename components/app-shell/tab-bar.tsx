"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, CalendarDays, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "week", href: "/week", icon: CalendarDays },
  { key: "history", href: "/history", icon: History },
  { key: "examples", href: "/examples", icon: BookOpen },
  { key: "profile", href: "/profile", icon: User },
] as const;

export function TabBar() {
  const t = useTranslations("Tabs");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="grid flex-none grid-cols-4 border-t border-line bg-surface-1 px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))]"
    >
      {tabs.map(({ key, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-15 flex-col items-center justify-center gap-1",
              active ? "text-text" : "text-text-3",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-14 items-center justify-center rounded-full",
                active && "bg-surface-3",
              )}
            >
              <Icon className="size-[22px]" aria-hidden />
            </span>
            <span className="max-w-21 truncate text-xs font-bold">
              {t(key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
