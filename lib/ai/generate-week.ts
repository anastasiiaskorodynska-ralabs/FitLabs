import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GenerationError, WEEK_MODEL, anthropic } from "./client";
import type { GenerationContext } from "./context";
import { WEEK_SYSTEM_PROMPT, buildRetryPrompt, buildWeekUserPrompt } from "./prompts";
import { checkWeekPlan } from "./rules";
import { aiWeekPlanSchema, type AiWeekPlan } from "./schemas";

type Attempt =
  | { ok: true; plan: AiWeekPlan }
  | { ok: false; errors: string[]; content?: Anthropic.Beta.BetaContentBlockParam[] };

// Only the JSON schema is sent (no SDK auto-parse), so an invalid answer is
// parsed here and kept for the retry instead of being thrown away.
const WEEK_FORMAT = { type: "json_schema" as const, schema: betaZodOutputFormat(aiWeekPlanSchema).schema };

async function requestPlan(messages: Anthropic.Beta.BetaMessageParam[], ctx: GenerationContext): Promise<Attempt> {
  const message = await anthropic()
    .beta.messages.stream({
      model: WEEK_MODEL,
      max_tokens: 64000,
      // Re-runs a safety-classifier decline on the recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: WEEK_FORMAT },
      system: [{ type: "text", text: WEEK_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages,
    })
    .finalMessage();

  if (message.stop_reason === "refusal") throw new GenerationError("refused", message.stop_details?.explanation ?? undefined);
  if (message.stop_reason === "max_tokens") return { ok: false, errors: ["The plan was cut off. Keep technique notes short."] };

  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["The output was not valid JSON."], content: message.content as Anthropic.Beta.BetaContentBlockParam[] };
  }

  const parsed = aiWeekPlanSchema.safeParse(json);
  if (!parsed.success) {
    const errors = parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".")}: ${i.message}`);
    return { ok: false, errors, content: message.content as Anthropic.Beta.BetaContentBlockParam[] };
  }

  const { plan, errors } = checkWeekPlan(parsed.data, ctx);
  if (errors.length) return { ok: false, errors, content: message.content as Anthropic.Beta.BetaContentBlockParam[] };
  return { ok: true, plan };
}

// Generates the week; on invalid output retries once with the problems listed.
export async function generateWeekPlan(ctx: GenerationContext): Promise<AiWeekPlan> {
  if (ctx.targets.length === 0) throw new GenerationError("noTargets");

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: buildWeekUserPrompt(ctx) }];
  const first = await requestPlan(messages, ctx);
  if (first.ok) return first.plan;

  // Append-only: keep the first answer (with its thinking blocks) and ask for a fix.
  const retry: Anthropic.Beta.BetaMessageParam[] = first.content
    ? [...messages, { role: "assistant", content: first.content }, { role: "user", content: buildRetryPrompt(first.errors) }]
    : [{ role: "user", content: `${buildWeekUserPrompt(ctx)}\n\n${buildRetryPrompt(first.errors)}` }];

  const second = await requestPlan(retry, ctx);
  if (second.ok) return second.plan;

  console.error("generate-week: invalid after retry", second.errors);
  throw new GenerationError("invalid", second.errors.join("; "));
}
