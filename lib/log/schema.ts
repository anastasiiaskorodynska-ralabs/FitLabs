import { z } from "zod";

// What the Log results screen sends when the session is marked Done or Skipped.
export const logSetSchema = z.object({
  id: z.uuid(),
  done: z.boolean(),
  kg: z.number().min(0).max(999).nullable(),
  reps: z.number().int().min(0).max(999).nullable(),
  seconds: z.number().int().min(0).max(3600).nullable(),
});

export const logSessionSchema = z.object({
  sessionId: z.uuid(),
  status: z.enum(["done", "skipped"]),
  notes: z.string().max(2000),
  saveExample: z.boolean(),
  sets: z.array(logSetSchema).max(300),
  rounds: z.array(z.object({ id: z.uuid(), rounds: z.number().int().min(0).max(50) })).max(50),
  exerciseNotes: z.array(z.object({ id: z.uuid(), notes: z.string().max(1000) })).max(100),
});

export type LogSet = z.infer<typeof logSetSchema>;
export type LogSessionInput = z.infer<typeof logSessionSchema>;
