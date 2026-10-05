"use client";

import { useFormatter, useTranslations } from "next-intl";
import { EllipsisVertical, Sparkles } from "lucide-react";
import { DAY_TYPE_STYLE } from "@/lib/day-types";
import type { Example } from "@/lib/examples/schema";
import { cn } from "@/lib/utils";

const PREVIEW_LINES = 3;

export function ExampleCard({
  example,
  onOpen,
  onMore,
}: {
  example: Example;
  onOpen: () => void;
  onMore: () => void;
}) {
  const t = useTranslations("Examples");
  const tTypes = useTranslations("DayTypes");
  const format = useFormatter();

  const lines = example.rawText.split("\n").filter((l) => l.trim());
  const title = example.title ?? lines[0] ?? "";
  const preview = example.title ? lines : lines.slice(1);
  const date = format.dateTime(new Date(example.createdAt), { month: "short", day: "numeric" });
  const style = example.dayType ? DAY_TYPE_STYLE[example.dayType] : null;

  return (
    <article className="relative flex flex-none flex-col gap-2.5 rounded-[20px] border border-line bg-surface-1 p-4 active:scale-[.99]">
      {/* Whole card opens the editor; the More button sits above it. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("editNamed", { title })}
        className="absolute inset-0 rounded-[20px]"
      />
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold",
            style ? style.tint : "bg-skip-tint text-skip-text",
          )}
        >
          <span className={cn("size-1.5 rounded-full", style ? style.dot : "bg-text-3")} />
          {example.dayType ? tTypes(`long.${example.dayType}`) : t("untagged")}
        </span>
        {example.source === "log" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-brand-text">
            <Sparkles className="size-[13px]" aria-hidden />
            {t("fromLog")}
          </span>
        )}
        <button
          type="button"
          onClick={onMore}
          aria-label={t("more")}
          className="relative -mr-2 ml-auto flex size-11 items-center justify-center rounded-xl text-text-2"
        >
          <EllipsisVertical className="size-[19px]" />
        </button>
      </div>
      <h2 className="-mt-1 text-lg font-bold">{title}</h2>
      {preview.length > 0 && (
        <div className="flex flex-col gap-[3px] rounded-xl bg-surface-2 px-3 py-2.5">
          {preview.slice(0, PREVIEW_LINES).map((line, i) => (
            <span key={i} className="truncate text-sm leading-[1.35] text-text-2">
              {line}
            </span>
          ))}
          {preview.length > PREVIEW_LINES && (
            <span className="text-[13px] font-semibold text-text-3">
              {t("moreLines", { count: preview.length - PREVIEW_LINES })}
            </span>
          )}
        </div>
      )}
      <span className="text-xs font-semibold text-text-3">
        {example.source === "log" ? t("savedFromLog", { date }) : t("pasted", { date })}
      </span>
    </article>
  );
}
