"use server";

import { revalidatePath } from "next/cache";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { sessionToExampleText } from "@/lib/log/example-text";
import { logSessionSchema } from "@/lib/log/schema";
import { loadSession } from "@/lib/sessions/data";

export type LogResult = { ok: true } | { ok: false; error: "invalid" | "saveFailed" };

// Saves actual values, notes and status; optionally stores the session as an example.
export async function logSession(input: unknown): Promise<LogResult> {
  const { supabase } = await requireUser();
  const parsed = logSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const log = parsed.data;

  const session = await loadSession(supabase, log.sessionId);
  if (!session) return { ok: false, error: "invalid" };

  let exampleText: string | null = null;
  let exampleTitle: string | null = null;
  if (log.status === "done" && log.saveExample) {
    const locale = await getLocale();
    const t = await getTranslations("Log.example");
    const tTypes = await getTranslations("DayTypes");
    const format = await getFormatter();
    const ids = [...new Set(session.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId)))];
    const { data: names } = await supabase.from("exercises").select("id, name_en, name_uk").in("id", ids);
    const nameById = new Map((names ?? []).map((n) => [n.id, locale === "uk" ? n.name_uk : n.name_en]));

    exampleText = sessionToExampleText(session, log, (id) => nameById.get(id) ?? "?", {
      superset: (letter) => t("superset", { letter }),
      circuit: (n) => t("circuit", { n }),
      finisher: t("finisher"),
      rounds: (n) => t("rounds", { count: n }),
      perSide: t("perSide"),
    });
    exampleTitle = `${tTypes(`short.${session.dayType}`)} · ${format.dateTime(new Date(`${session.date}T00:00:00Z`), {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })}`;
  }

  const { error } = await supabase.rpc("log_session", {
    p_session_id: session.id,
    p_status: log.status,
    p_session_notes: log.notes,
    p_sets: log.status === "done" ? log.sets.map((s) => ({ id: s.id, completed: s.done, kg: s.kg, reps: s.reps, seconds: s.seconds })) : [],
    p_rounds: log.status === "done" ? log.rounds : [],
    p_notes: log.exerciseNotes,
    p_example_title: exampleTitle,
    p_example_text: exampleText,
  });
  if (error) {
    console.error("log_session failed", error);
    return { ok: false, error: "saveFailed" };
  }

  revalidatePath(`/session/${session.id}`, "layout");
  revalidatePath("/week");
  revalidatePath("/history");
  revalidatePath("/examples");
  return { ok: true };
}
