"use client";

import { useTranslations } from "next-intl";
import { DAY_TYPE_STYLE, type DayType } from "@/lib/day-types";
import { DAY_TYPES } from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";

// Lower / Upper / Functional circuit, one row of three (examples, Log workout).
export function DayTypePicker({
  value,
  onChange,
  label,
}: {
  value: DayType | null;
  onChange: (type: DayType) => void;
  label: string;
}) {
  const t = useTranslations("DayTypes");
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
      {DAY_TYPES.map((type) => {
        const on = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(type)}
            className={cn(
              "flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] px-2 py-2 text-center text-sm leading-tight font-bold",
              on ? DAY_TYPE_STYLE[type].picked : "border-line text-text-2",
            )}
          >
            <span className={cn("size-2.5 flex-none rounded-full", DAY_TYPE_STYLE[type].dot)} aria-hidden />
            {t(`long.${type}`)}
          </button>
        );
      })}
    </div>
  );
}
