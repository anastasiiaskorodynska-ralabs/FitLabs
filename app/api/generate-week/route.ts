import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { toGenerationError } from "@/lib/ai/client";
import { loadGenerationContext } from "@/lib/ai/context";
import { generateWeekPlan } from "@/lib/ai/generate";
import { saveWeekPlan } from "@/lib/ai/save";
import { generateWeekRequestSchema } from "@/lib/ai/schemas";
import { weekStart } from "@/lib/sessions/format";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";

// Generation takes ~20-60 s; allow for one retry.
export const maxDuration = 300;

const STATUS = { noTargets: 409, refused: 422, invalid: 502, rateLimited: 429, unavailable: 503, failed: 500 } as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = generateWeekRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });
  const start = weekStart(body.data.weekStart);

  try {
    const ctx = await loadGenerationContext(supabase, start, await todayIso());
    const plan = await generateWeekPlan(ctx);
    const saved = await saveWeekPlan(supabase, start, plan);
    revalidatePath("/week");
    return NextResponse.json({ saved });
  } catch (error) {
    const err = toGenerationError(error);
    if (err.code !== "noTargets") console.error("generate-week failed", err.code, err.message);
    return NextResponse.json({ error: err.code }, { status: STATUS[err.code] });
  }
}
