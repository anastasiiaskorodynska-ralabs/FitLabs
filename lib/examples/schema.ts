import { z } from "zod";
import { DAY_TYPES } from "@/lib/onboarding/schema";

// Error messages are keys under Examples.errors in messages/*.json.
export const exampleSchema = z.object({
  dayType: z.enum(DAY_TYPES, "pickType"),
  title: z.string().trim().max(80, "tooLong"),
  rawText: z.string().trim().min(1, "textRequired").max(20000, "tooLong"),
});

export type ExampleInput = z.infer<typeof exampleSchema>;

export type ExampleDraft = Omit<ExampleInput, "dayType"> & {
  dayType: ExampleInput["dayType"] | null;
};

export type Example = {
  id: string;
  dayType: ExampleInput["dayType"] | null;
  title: string | null;
  rawText: string;
  source: "pasted" | "log";
  createdAt: string;
};
