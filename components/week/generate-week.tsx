"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Circle, CircleCheck, LoaderCircle, Sparkles } from "lucide-react";
import { PrimaryButton } from "@/components/bottom-sheet";
import { FieldError } from "@/components/onboarding/controls";
import { DAY_TYPE_STYLE, type DayType } from "@/lib/day-types";
import { weekdayOf } from "@/lib/sessions/format";
import { cn } from "@/lib/utils";

const EXPECTED_SECONDS = 40;
const STEPS = ["goal", "balance", "exercises", "weights"] as const;

// "Generate this week" with the design's loading state. Progress is an
// estimate: the request gives no intermediate events.
export function GenerateWeek({
  weekStart,
  targets,
}: {
  weekStart: string;
  targets: { date: string; dayType: DayType }[];
}) {
  const t = useTranslations("Week.generate");
  const tDays = useTranslations("Days");
  const tTypes = useTranslations("DayTypes");
  const router = useRouter();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [startedAt]);

  const generate = async () => {
    setError(undefined);
    const started = Date.now();
    setStartedAt(started);
    setNow(started);
    try {
      const res = await fetch("/api/generate-week", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      if (!res.ok) {
        const { error: code } = (await res.json().catch(() => ({}))) as { error?: string };
        setError(t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.failed"));
        setStartedAt(null);
        return;
      }
      router.refresh();
    } catch {
      setError(t("errors.network"));
      setStartedAt(null);
    }
  };

  if (startedAt === null) {
    return (
      <div className="flex flex-col gap-3">
        <FieldError message={error} />
        <PrimaryButton onClick={generate}>
          <Sparkles className="size-5" aria-hidden />
          {error ? t("retry") : t("button")}
        </PrimaryButton>
      </div>
    );
  }

  const elapsed = (now - startedAt) / 1000;
  // Eases towards 96% and keeps creeping if it takes longer than expected.
  const fraction = 1 - Math.exp(-elapsed / (EXPECTED_SECONDS * 0.6));
  const pct = Math.round(4 + fraction * 92);
  const left = Math.max(1, Math.ceil(EXPECTED_SECONDS - elapsed));
  const at = Math.min(STEPS.length - 0.01, (elapsed / EXPECTED_SECONDS) * STEPS.length);

  return (
    <div className="flex flex-col gap-3" aria-busy>
      <section className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-surface-1 p-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t("building")}</h2>
          <span className="text-[13px] font-semibold text-text-2">
            {elapsed < EXPECTED_SECONDS ? t("timeLeft", { seconds: left }) : t("almost")}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t("building")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2 overflow-hidden rounded-full bg-surface-3"
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
        </div>
        <ol className="flex flex-col gap-2.5">
          {STEPS.map((step, i) => {
            const done = at >= i + 1;
            const active = !done && at >= i;
            return (
              <li key={step} className="flex min-h-6 items-center gap-2.5">
                <span className={cn("flex size-[22px] flex-none items-center justify-center", done ? "text-done" : active ? "text-brand-text" : "text-line-strong")}>
                  {done ? (
                    <CircleCheck className="size-5" aria-hidden />
                  ) : active ? (
                    <LoaderCircle className="size-[18px] animate-spin" aria-hidden />
                  ) : (
                    <Circle className="size-5" aria-hidden />
                  )}
                </span>
                <span className={cn("text-[15px] font-semibold", done ? "text-text-2" : active ? "text-text" : "text-text-3")}>
                  {t(`steps.${step}`)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {targets.map((target) => {
        const style = DAY_TYPE_STYLE[target.dayType];
        return (
          <div key={target.date} aria-hidden className="flex items-center gap-3.5 rounded-[20px] border border-line bg-surface-1 p-3.5">
            <div className={cn("flex size-14 flex-none flex-col items-center justify-center gap-0.5 rounded-[14px]", style.tint)}>
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase">{tDays(`short.${weekdayOf(target.date)}`)}</span>
              <span className="text-[22px] leading-none font-extrabold">{new Date(`${target.date}T00:00:00Z`).getUTCDate()}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-[17px] leading-[1.25] font-bold">{tTypes(`long.${target.dayType}`)}</span>
              <span className="h-2.5 w-3/5 animate-pulse rounded-full bg-surface-3" />
            </div>
            <span className="h-[30px] w-20 animate-pulse rounded-full bg-surface-2" />
          </div>
        );
      })}
    </div>
  );
}
