import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { toGenerationError } from "@/lib/ai/client";
import { generateDay } from "@/lib/ai/generate";
import { saveDay } from "@/lib/ai/save";
import { regenerateDayRequestSchema } from "@/lib/ai/schemas";
import { NotEditableError, describeBlocks, loadSessionForAi } from "@/lib/ai/session";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";

// One session takes ~15-40 s; allow for one retry.
export const maxDuration = 300;

const STATUS = { noTargets: 409, refused: 422, invalid: 502, rateLimited: 429, unavailable: 503, failed: 500 } as const;

// Replaces a planned session's exercises with a new AI version (or fills an empty one).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = regenerateDayRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  try {
    const { session, ctx } = await loadSessionForAi(supabase, body.data.sessionId, await todayIso());
    const names = new Map(ctx.library.map((e) => [e.id, e.nameEn]));
    const day = await generateDay(ctx, describeBlocks(session.blocks, names), body.data.reason);
    await saveDay(supabase, session.id, day);
    revalidatePath(`/session/${session.id}`);
    revalidatePath("/week");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotEditableError) return NextResponse.json({ error: "notPlanned" }, { status: 409 });
    const err = toGenerationError(error);
    console.error("regenerate-day failed", err.code, err.message);
    return NextResponse.json({ error: err.code }, { status: STATUS[err.code] });
  }
}
