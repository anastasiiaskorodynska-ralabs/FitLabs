import { getLocale } from "next-intl/server";
import { HistoryView } from "@/components/history/history-view";
import { requireUser } from "@/lib/auth";
import { loadHistory } from "@/lib/history/data";
import { todayIso } from "@/lib/today";

export default async function HistoryPage() {
  const { supabase } = await requireUser();
  const { sessions, progress } = await loadHistory(supabase, await todayIso(), await getLocale());
  return <HistoryView sessions={sessions} progress={progress} />;
}
