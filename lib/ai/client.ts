import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

// Server-side only: reads ANTHROPIC_API_KEY from the environment.
export function anthropic() {
  client ??= new Anthropic();
  return client;
}

// Week and day generation (see CLAUDE.md "AI generation").
export const WEEK_MODEL = "claude-sonnet-5-5";

export type GenerationErrorCode = "noTargets" | "refused" | "invalid" | "rateLimited" | "unavailable" | "failed";

export class GenerationError extends Error {
  constructor(
    public code: GenerationErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

// Maps SDK errors to codes the UI can explain.
export function toGenerationError(error: unknown): GenerationError {
  if (error instanceof GenerationError) return error;
  if (error instanceof Anthropic.RateLimitError) return new GenerationError("rateLimited", error.message);
  if (error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
    return new GenerationError("unavailable", error.message);
  }
  if (error instanceof Anthropic.APIError) return new GenerationError("failed", `${error.status}: ${error.message}`);
  return new GenerationError("failed", error instanceof Error ? error.message : String(error));
}
