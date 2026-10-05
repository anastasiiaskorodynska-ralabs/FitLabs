import type { DAY_TYPES } from "@/lib/onboarding/schema";

export type DayType = (typeof DAY_TYPES)[number];

// Colour classes per workout type, from the FitLabs design system.
export const DAY_TYPE_STYLE: Record<DayType, { tint: string; dot: string; picked: string }> = {
  lower: { tint: "bg-lower-tint text-lower-text", dot: "bg-lower", picked: "border-lower bg-lower-tint text-lower-text" },
  upper: { tint: "bg-upper-tint text-upper-text", dot: "bg-upper", picked: "border-upper bg-upper-tint text-upper-text" },
  func: { tint: "bg-func-tint text-func-text", dot: "bg-func", picked: "border-func bg-func-tint text-func-text" },
  full: { tint: "bg-full-tint text-full-text", dot: "bg-full", picked: "border-text-2 bg-surface-3 text-text" },
};
