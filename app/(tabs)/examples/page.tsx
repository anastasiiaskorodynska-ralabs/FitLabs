import { ExamplesView } from "@/components/examples/examples-view";
import { requireUser } from "@/lib/auth";
import type { Example } from "@/lib/examples/schema";

export default async function ExamplesPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("examples")
    .select("id, day_type, title, raw_text, source, created_at")
    .order("created_at", { ascending: false });

  const examples: Example[] = (data ?? []).map((e) => ({
    id: e.id,
    dayType: e.day_type,
    title: e.title,
    rawText: e.raw_text,
    source: e.source,
    createdAt: e.created_at,
  }));

  return <ExamplesView examples={examples} />;
}
