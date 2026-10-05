"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Mail, MailCheck } from "lucide-react";
import { signIn, type SignInState } from "@/app/login/actions";
import { PasswordInput } from "./password-input";

const initialState: SignInState = { status: "idle" };

export function SignInForm({
  next,
  linkError,
}: {
  next?: string;
  linkError?: boolean;
}) {
  const t = useTranslations("SignIn");
  const [state, action, pending] = useActionState(signIn, initialState);
  const error = state.error ?? (linkError && state.status === "idle" ? "linkExpired" : undefined);

  return (
    <form action={action} className="flex flex-col gap-7" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-text-2">{t("email")}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={state.email}
            aria-invalid={state.error === "invalidEmail" || undefined}
            className="h-14 rounded-[14px] border-[1.5px] border-line-strong bg-surface-1 px-4 text-[17px] font-medium text-text outline-none focus:border-2 focus:border-brand focus:shadow-[0_0_0_4px_var(--brand-tint)]"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-text-2">{t("password")}</span>
          <PasswordInput name="password" autoComplete="current-password" />
        </label>
      </div>

      {error && (
        <p role="alert" className="-mt-3 text-[15px] font-medium text-danger">
          {t(`errors.${error}`)}
        </p>
      )}

      {state.status === "sent" && (
        <p
          role="status"
          className="-mt-3 flex items-start gap-2 rounded-[14px] bg-done-tint p-3 text-[15px] font-medium text-done-text"
        >
          <MailCheck className="mt-0.5 size-5 flex-none" aria-hidden />
          {t("magicSent", { email: state.email ?? "" })}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          name="intent"
          value="password"
          disabled={pending}
          className="min-h-16 rounded-[18px] bg-brand px-5 text-[17px] font-bold text-on-brand active:scale-[.98] active:bg-brand-press disabled:opacity-60"
        >
          {t("signIn")}
        </button>
        <div className="flex items-center gap-3 text-[13px] font-semibold text-text-3">
          <span className="h-px flex-1 bg-line" />
          {t("or")}
          <span className="h-px flex-1 bg-line" />
        </div>
        <button
          type="submit"
          name="intent"
          value="magic"
          disabled={pending}
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-line-strong px-5 text-base font-semibold text-text active:scale-[.98] disabled:opacity-60"
        >
          <Mail className="size-5" aria-hidden />
          {t("magic")}
        </button>
        <p className="text-center text-[13px] leading-snug text-text-3">{t("magicHint")}</p>
      </div>
    </form>
  );
}
