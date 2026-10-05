import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { LogView, type NextSession } from "@/components/log/log-view";
import { isOnboarded, requireUser } from "@/lib/auth";
import { loadLibrary, loadSession } from "@/lib/sessions/data";

export default async function LogPage({ params }: PageProps<"/session/[id]/log">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  if (!(await isOnboarded())) redirect("/onboarding");

  const [session, library] = await Promise.all([loadSession(supabase, id), loadLibrary(supabase, await getLocale())]);
  if (!session) notFound();

  // "Up next" on the success screen: the next planned session after this one.
  const { data: next } = await supabase
    .from("sessions")
    .select("id, date, day_type")
    .eq("status", "planned")
    .gt("date", session.date)
    .order("date")
    .limit(1)
    .maybeSingle();

  const nextSession: NextSession | null = next ? { id: next.id, date: next.date, dayType: next.day_type } : null;
  return <LogView session={session} library={library} next={nextSession} />;
}
