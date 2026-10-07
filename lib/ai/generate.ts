import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { EXERCISE_MODEL, GenerationError, WEEK_MODEL, anthropic } from "./client";
import type { GenerationContext } from "./context";
import {
  PLAN_SYSTEM_PROMPT,
  buildDayUserPrompt,
  buildExerciseUserPrompt,
  buildRetryPrompt,
  buildWeekUserPrompt,
} from "./prompts";
import { checkExerciseOptions, checkWeekPlan, type CheckResult, type ExerciseSlot } from "./rules";
import { aiExerciseOptionsSchema, aiWeekPlanSchema, type AiExerciseOption, type AiWeekPlan } from "./schemas";

type Model = typeof WEEK_MODEL | typeof EXERCISE_MODEL;

type Attempt<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[]; content?: Anthropic.Beta.BetaContentBlockParam[] };

function requestParams(model: Model) {
  // Sonnet: adaptive thinking at high effort (more careful plans), with
  // server-side fallback on a safety decline. Haiku 4.5 takes neither.
  return model === WEEK_MODEL
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const, effort: "high" as const }
    : { betas: undefined, fallbacks: undefined, effort: undefined };
}

async function attempt<S extends z.ZodType, T>(
  model: Model,
  schema: S,
  messages: Anthropic.Beta.BetaMessageParam[],
  check: (parsed: z.infer<S>) => CheckResult<T>,
): Promise<Attempt<T>> {
  const { betas, fallbacks, effort } = requestParams(model);
  // Only the JSON schema is sent (no SDK auto-parse), so an invalid answer is
  // parsed here and kept for the retry instead of being thrown away.
  const format = { type: "json_schema" as const, schema: betaZodOutputFormat(schema).schema };

  const message = await anthropic()
    .beta.messages.stream({
      model,
      max_tokens: model === WEEK_MODEL ? 64000 : 8000,
      ...(betas ? { betas, fallbacks } : {}),
      output_config: effort ? { effort, format } : { format },
      system: [{ type: "text", text: PLAN_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages,
    })
    .finalMessage();

  if (message.stop_reason === "refusal") throw new GenerationError("refused", message.stop_details?.explanation ?? undefined);
  if (message.stop_reason === "max_tokens") return { ok: false, errors: ["The answer was cut off. Keep technique notes short."] };

  const content = message.content as Anthropic.Beta.BetaContentBlockParam[];
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["The output was not valid JSON."], content };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".")}: ${i.message}`), content };
  }
  const { value, errors } = check(parsed.data);
  return errors.length ? { ok: false, errors, content } : { ok: true, value };
}

// Asks once; if the answer is invalid, asks again with the problems listed.
async function generate<S extends z.ZodType, T>(
  model: Model,
  schema: S,
  userPrompt: string,
  check: (parsed: z.infer<S>) => CheckResult<T>,
): Promise<T> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userPrompt }];
  const first = await attempt(model, schema, messages, check);
  if (first.ok) return first.value;

  // Append-only: keep the first answer (with its thinking blocks) and ask for a fix.
  const retry: Anthropic.Beta.BetaMessageParam[] = first.content
    ? [...messages, { role: "assistant", content: first.content }, { role: "user", content: buildRetryPrompt(first.errors) }]
    : [{ role: "user", content: `${userPrompt}\n\n${buildRetryPrompt(first.errors)}` }];
  const second = await attempt(model, schema, retry, check);
  if (second.ok) return second.value;

  console.error("ai generation invalid after retry", second.errors);
  throw new GenerationError("invalid", second.errors.join("; "));
}

export async function generateWeekPlan(ctx: GenerationContext): Promise<AiWeekPlan> {
  if (ctx.targets.length === 0) throw new GenerationError("noTargets");
  return generate(WEEK_MODEL, aiWeekPlanSchema, buildWeekUserPrompt(ctx), (plan) => checkWeekPlan(plan, ctx));
}

// One session for ctx.targets[0]; `current` describes it as it is now.
export async function generateDay(ctx: GenerationContext, current: string[], reason?: string) {
  const plan = await generate(WEEK_MODEL, aiWeekPlanSchema, buildDayUserPrompt(ctx, current, reason), (p) =>
    checkWeekPlan(p, ctx),
  );
  return plan.sessions[0];
}

export async function generateExerciseOptions(
  ctx: GenerationContext,
  session: string[],
  target: { name: string; where: string } & ExerciseSlot,
  count: number,
  reason?: string,
): Promise<AiExerciseOption[]> {
  return generate(
    EXERCISE_MODEL,
    aiExerciseOptionsSchema,
    buildExerciseUserPrompt(ctx, session, target, count, reason),
    (out) => checkExerciseOptions(out.options, ctx, target, count),
  );
}
