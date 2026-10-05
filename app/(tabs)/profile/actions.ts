"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  aboutSchema,
  equipmentSchema,
  goalSchema,
  rulesSchema,
  scheduleSchema,
} from "@/lib/onboarding/schema";

export type SaveResult = { ok: true } | { ok: false; error: "invalid" | "saveFailed" };

const personalSchema = aboutSchema.extend(goalSchema.shape);

function done(error: unknown): SaveResult {
  if (error) {
    console.error("profile save failed", error);
    return { ok: false, error: "saveFailed" };
  }
  revalidatePath("/profile");
  return { ok: true };
}

export async function savePersonal(input: unknown): Promise<SaveResult> {
  const { supabase } = await requireUser();
  const parsed = personalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;

  const { error } = await supabase
    .from("profile")
    .update({
      display_name: d.name,
      sex: d.sex,
      birth_year: new Date().getFullYear() - d.age,
      height_cm: d.height,
      weight_kg: d.weight,
      level: d.level,
      goal: d.goal,
    })
    .eq("id", 1);
  return done(error);
}

export async function saveSchedule(input: unknown): Promise<SaveResult> {
  const { supabase } = await requireUser();
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { days, sessionLength } = parsed.data;

  // Upsert the chosen days first, then drop the rest, so a failure never leaves the week empty.
  const upsert = await supabase
    .from("schedule_days")
    .upsert(days.map((d) => ({ weekday: d.weekday, day_type: d.dayType })));
  if (upsert.error) return done(upsert.error);

  const keep = days.map((d) => d.weekday).join(",");
  const remove = await supabase.from("schedule_days").delete().not("weekday", "in", `(${keep})`);
  if (remove.error) return done(remove.error);

  const profile = await supabase
    .from("profile")
    .update({ session_length_min: sessionLength })
    .eq("id", 1);
  return done(profile.error);
}

export async function saveRules(input: unknown): Promise<SaveResult> {
  const { supabase } = await requireUser();
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;

  const { error } = await supabase
    .from("training_rules")
    .update({
      no_warmup: d.noWarmup,
      abs_finisher: d.absFinisher,
      avoid_terms: d.avoid,
      notes: d.notes.trim() || null,
    })
    .eq("id", 1);
  return done(error);
}

// Matches the slug complete_onboarding() gives custom equipment.
const customSlug = (name: string) =>
  `custom-${createHash("md5").update(name.trim().toLowerCase()).digest("hex")}`;

export async function saveEquipment(input: unknown): Promise<SaveResult> {
  const { supabase } = await requireUser();
  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { equipmentIds, custom } = parsed.data;

  if (custom.length) {
    const insert = await supabase.from("equipment").upsert(
      custom.map((name) => ({
        slug: customSlug(name),
        name_en: name.trim(),
        name_uk: name.trim(),
        category: "accessories",
        position: 100,
        is_custom: true,
      })),
      { onConflict: "slug", ignoreDuplicates: true },
    );
    if (insert.error) return done(insert.error);
  }

  const slugs = custom.map(customSlug);
  const selected = [
    equipmentIds.length ? `id.in.(${equipmentIds.join(",")})` : null,
    slugs.length ? `slug.in.(${slugs.join(",")})` : null,
  ].filter(Boolean);

  if (selected.length) {
    const on = await supabase.from("equipment").update({ available: true }).or(selected.join(","));
    if (on.error) return done(on.error);
  }

  let off = supabase.from("equipment").update({ available: false });
  if (equipmentIds.length) off = off.not("id", "in", `(${equipmentIds.join(",")})`);
  if (slugs.length) off = off.not("slug", "in", `(${slugs.join(",")})`);
  const { error } = await off.eq("available", true);
  return done(error);
}
