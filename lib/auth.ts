import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Verifies the session against Supabase. Use in every protected layout, page and action.
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return { supabase, claims: data.claims };
});

export const isOnboarded = cache(async () => {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("profile")
    .select("onboarded_at")
    .eq("id", 1)
    .single();
  return Boolean(data?.onboarded_at);
});

// Only same-site relative paths, so ?next= can't redirect off-site.
export function safeNext(next: unknown, fallback = "/week") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : fallback;
}
