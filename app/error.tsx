"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { StatusScreen, primaryLinkClass, secondaryLinkClass } from "@/components/status-screen";

// Error boundary for every page under the root layout.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Status.error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen icon={TriangleAlert} title={t("title")} body={t("body")}>
      <button type="button" onClick={reset} className={primaryLinkClass}>
        {t("retry")}
      </button>
      <Link href="/week" className={secondaryLinkClass}>
        {t("home")}
      </Link>
    </StatusScreen>
  );
}
