"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  status: "idle" | "error" | "sent";
  // Key under SignIn.errors in messages/*.json
  error?: "invalidEmail" | "missingPassword" | "invalidCredentials" | "rateLimited" | "generic";
  email?: string;
};

const emailSchema = z.email();

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const intent = formData.get("intent");
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!emailSchema.safeParse(email).success) {
    return { status: "error", error: "invalidEmail", email };
  }

  const supabase = await createClient();

  if (intent === "magic") {
    const origin = (await headers()).get("origin");
    const callback = new URL("/auth/callback", origin ?? "http://localhost:3000");
    callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: callback.toString() },
    });

    if (error?.status === 429) return { status: "error", error: "rateLimited", email };
    // Same reply whether or not the account exists, so the form can't be used to probe emails.
    return { status: "sent", email };
  }

  const password = String(formData.get("password") ?? "");
  if (!password) return { status: "error", error: "missingPassword", email };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { status: "error", error: "rateLimited", email };
    if (error.code === "invalid_credentials") {
      return { status: "error", error: "invalidCredentials", email };
    }
    return { status: "error", error: "generic", email };
  }

  redirect(next);
}
