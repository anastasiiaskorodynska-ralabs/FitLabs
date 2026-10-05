"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { exampleSchema } from "@/lib/examples/schema";

export type ExampleResult = { ok: true } | { ok: false; error: "invalid" | "saveFailed" };

const idSchema = z.uuid();

function done(error: unknown): ExampleResult {
  if (error) {
    console.error("example save failed", error);
    return { ok: false, error: "saveFailed" };
  }
  revalidatePath("/examples");
  return { ok: true };
}

function toRow(input: z.infer<typeof exampleSchema>) {
  return {
    day_type: input.dayType,
    title: input.title || null,
    raw_text: input.rawText,
  };
}

export async function createExample(input: unknown): Promise<ExampleResult> {
  const { supabase } = await requireUser();
  const parsed = exampleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { error } = await supabase
    .from("examples")
    .insert({ ...toRow(parsed.data), source: "pasted" });
  return done(error);
}

export async function updateExample(id: unknown, input: unknown): Promise<ExampleResult> {
  const { supabase } = await requireUser();
  const parsedId = idSchema.safeParse(id);
  const parsed = exampleSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false, error: "invalid" };

  const { error } = await supabase.from("examples").update(toRow(parsed.data)).eq("id", parsedId.data);
  return done(error);
}

export async function deleteExample(id: unknown): Promise<ExampleResult> {
  const { supabase } = await requireUser();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "invalid" };

  const { error } = await supabase.from("examples").delete().eq("id", parsedId.data);
  return done(error);
}
