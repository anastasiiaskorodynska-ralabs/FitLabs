import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isExerciseAllowed, type EquipmentRef } from "@/lib/exercises/allowed";
import type { DayType } from "@/lib/day-types";
import { addDays } from "@/lib/sessions/format";

const EXAMPLES_PER_TYPE = 6;
const HISTORY_DAYS = 28;
const PERFORMANCES_PER_EXERCISE = 3;

export type LibraryEntry = {
  id: string;
  nameEn: string;
  nameUk: string;
  muscles: string[];
  dayTypes: DayType[];
  equipmentSlugs: string[];
  measure: "reps" | "seconds";
  perSide: boolean;
  isBodyweight: boolean;
  isAbs: boolean;
  allowed: boolean;
};

export type GenerationContext = {
  weekStart: string;
  locale: "en" | "uk";
  targets: { date: string; dayType: DayType }[];
  sessionLength: number;
  profile: {
    name: string | null;
    sex: string | null;
    age: number | null;
    heightCm: number | null;
    weightKg: number | null;
    level: string;
    goal: string | null;
  };
  rules: {
    custom: string[]; // the user's own rules, followed via the prompt
    avoidCardioMachines: boolean;
    avoidTerms: string[];
  };
  equipment: { slug: string; name: string; isCardioMachine: boolean }[];
  library: LibraryEntry[];
  examples: { dayType: DayType | null; title: string | null; text: string }[];
  history: { date: string; dayType: DayType; lines: string[] }[];
  // Last few logged performances per exercise id, newest first.
  performances: Map<string, { date: string; sets: string }[]>;
};

type LoggedSet = {
  position: number;
  actual_kg: string | number | null;
  actual_reps: number | null;
  actual_seconds: number | null;
};

function formatSets(sets: LoggedSet[], perSide: boolean) {
  return [...sets]
    .sort((a, b) => a.position - b.position)
    .filter((s) => s.actual_reps !== null || s.actual_seconds !== null)
    .map((s) => {
      const amount = s.actual_seconds !== null ? `${s.actual_seconds}s` : `${s.actual_reps}${perSide ? "/side" : ""}`;
      return s.actual_kg === null ? `${amount} BW` : `${amount}×${Number(s.actual_kg)}kg`;
    })
    .join(", ");
}

// `target` plans one given day (regenerate day) instead of the week's open schedule days.
export async function loadGenerationContext(
  supabase: SupabaseClient,
  weekStart: string,
  today: string,
  target?: { date: string; dayType: DayType },
): Promise<GenerationContext> {
  const weekEnd = addDays(weekStart, 6);
  const historyBefore = target?.date ?? weekStart;
  const historyFrom = addDays(historyBefore, -HISTORY_DAYS);

  const [profileRes, rulesRes, scheduleRes, equipmentRes, libraryRes, examplesRes, existingRes, historyRes] =
    await Promise.all([
      supabase.from("profile").select("*").eq("id", 1).single(),
      supabase.from("training_rules").select("*").eq("id", 1).single(),
      supabase.from("schedule_days").select("weekday, day_type").order("weekday"),
      supabase.from("equipment").select("slug, name_en, name_uk, available, is_cardio_machine").order("category").order("position"),
      supabase
        .from("exercises")
        .select(
          "id, name_en, name_uk, muscle_groups, day_types, default_measure, per_side, is_bodyweight, is_abs, exercise_equipment(equipment(slug, name_en, name_uk, available, is_cardio_machine))",
        )
        .order("name_en"),
      supabase.from("examples").select("day_type, title, raw_text, created_at").order("created_at", { ascending: false }),
      supabase.from("sessions").select("date").gte("date", weekStart).lte("date", weekEnd),
      supabase
        .from("sessions")
        .select(
          "date, day_type, blocks(position, kind, rounds, block_exercises(position, exercise_id, per_side, exercises(name_en), sets(position, actual_kg, actual_reps, actual_seconds)))",
        )
        .eq("status", "done")
        .gte("date", historyFrom)
        .lt("date", historyBefore)
        .order("date", { ascending: false }),
    ]);

  const profile = profileRes.data;
  const rules = rulesRes.data;
  const avoidRules = {
    avoidTerms: rules?.avoid_terms ?? [],
    avoidCardioMachines: rules?.avoid_cardio_machines ?? false,
  };

  // Schedule days in this week from today on that don't have a session yet.
  const taken = new Set((existingRes.data ?? []).map((s) => s.date));
  const targets = target
    ? [target]
    : (scheduleRes.data ?? [])
        .map((d) => ({ date: addDays(weekStart, d.weekday), dayType: d.day_type as DayType }))
        .filter((t) => t.date >= today && !taken.has(t.date));

  const library: LibraryEntry[] = (libraryRes.data ?? []).map((e) => {
    const equipment = (e.exercise_equipment as unknown as { equipment: EquipmentRef }[]).map((x) => x.equipment);
    return {
      id: e.id,
      nameEn: e.name_en,
      nameUk: e.name_uk,
      muscles: e.muscle_groups,
      dayTypes: e.day_types,
      equipmentSlugs: equipment.map((q) => q.slug ?? ""),
      measure: e.default_measure,
      perSide: e.per_side,
      isBodyweight: e.is_bodyweight,
      isAbs: e.is_abs,
      allowed: isExerciseAllowed(e, equipment, avoidRules),
    };
  });

  // Up to N examples per day type (untagged ones count as their own group).
  const perType = new Map<string, number>();
  const examples = (examplesRes.data ?? []).filter((e) => {
    const key = e.day_type ?? "any";
    const n = perType.get(key) ?? 0;
    perType.set(key, n + 1);
    return n < EXAMPLES_PER_TYPE;
  });

  const performances = new Map<string, { date: string; sets: string }[]>();
  const history = (historyRes.data ?? []).map((s) => {
    const lines: string[] = [];
    const blocks = [...(s.blocks as { position: number; kind: string; rounds: number | null; block_exercises: unknown[] }[])].sort(
      (a, b) => a.position - b.position,
    );
    for (const b of blocks) {
      const items = [...(b.block_exercises as {
        position: number;
        exercise_id: string;
        per_side: boolean;
        exercises: { name_en: string } | null;
        sets: LoggedSet[];
      }[])].sort((a, z) => a.position - z.position);
      for (const item of items) {
        const sets = formatSets(item.sets, item.per_side);
        if (!sets) continue;
        const prefix = b.kind === "circuit" ? `[circuit ×${b.rounds ?? 1}] ` : b.kind === "superset" ? "[superset] " : "";
        lines.push(`${prefix}${item.exercises?.name_en ?? "?"}: ${sets}`);
        const list = performances.get(item.exercise_id) ?? [];
        if (list.length < PERFORMANCES_PER_EXERCISE) list.push({ date: s.date, sets });
        performances.set(item.exercise_id, list);
      }
    }
    return { date: s.date, dayType: s.day_type as DayType, lines };
  });

  const locale = profile?.locale === "uk" ? "uk" : "en";
  const equipment = (equipmentRes.data ?? [])
    .filter((q) => q.available)
    .map((q) => ({ slug: q.slug, name: q.name_en, isCardioMachine: q.is_cardio_machine }));

  return {
    weekStart,
    locale,
    targets,
    sessionLength: profile?.session_length_min ?? 60,
    profile: {
      name: profile?.display_name ?? null,
      sex: profile?.sex ?? null,
      age: profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null,
      heightCm: profile?.height_cm ? Number(profile.height_cm) : null,
      weightKg: profile?.weight_kg ? Number(profile.weight_kg) : null,
      level: profile?.level ?? "intermediate",
      goal: profile?.goal ?? null,
    },
    rules: {
      custom: (rules?.rules ?? []).map((r: string) => r.trim()).filter(Boolean),
      avoidCardioMachines: avoidRules.avoidCardioMachines,
      avoidTerms: avoidRules.avoidTerms,
    },
    equipment,
    library,
    examples: examples.map((e) => ({ dayType: e.day_type, title: e.title, text: e.raw_text })),
    history,
    performances,
  };
}

