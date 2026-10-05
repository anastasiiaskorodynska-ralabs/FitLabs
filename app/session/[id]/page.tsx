import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { SessionView } from "@/components/session/session-view";
import { isOnboarded, requireUser } from "@/lib/auth";
import { loadLibrary, loadSession } from "@/lib/sessions/data";

export default async function SessionPage({ params }: PageProps<"/session/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  if (!(await isOnboarded())) redirect("/onboarding");

  const [session, library] = await Promise.all([
    loadSession(supabase, id),
    loadLibrary(supabase, await getLocale()),
  ]);
  if (!session) notFound();

  return <SessionView session={session} library={library} />;
}
