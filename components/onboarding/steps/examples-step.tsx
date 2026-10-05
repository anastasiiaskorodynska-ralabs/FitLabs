"use client";

import { useTranslations } from "next-intl";
import { ClipboardPaste, Lock } from "lucide-react";
import { FieldError, StepIntro } from "../controls";
import type { StepProps } from "../types";

export function ExamplesStep({ draft, update, errors, errorText, hideIntro }: StepProps) {
  const t = useTranslations("Onboarding.examples");
  const lines = draft.example.split("\n").filter((l) => l.trim()).length;

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) update({ example: draft.example ? `${draft.example}\n\n${text}` : text });
    } catch {
      // Clipboard permission denied: the user can still long-press to paste.
    }
  };

  return (
    <>
      {!hideIntro && <StepIntro title={t("title")} sub={t("sub")} />}

      <div className="flex min-h-[300px] flex-[1_0_300px] flex-col overflow-hidden rounded-[18px] border-[1.5px] border-line-strong bg-surface-1 focus-within:border-2 focus-within:border-brand">
        <textarea
          value={draft.example}
          onChange={(e) => update({ example: e.target.value })}
          placeholder={t("placeholder")}
          aria-label={t("title")}
          className="flex-1 resize-none bg-transparent p-4 text-[17px] leading-normal font-medium text-text outline-none"
        />
        <div className="flex items-center justify-between gap-2 border-t border-line py-1.5 pr-1.5 pl-4">
          <span className="text-[13px] text-text-3">
            {lines ? t("lines", { count: lines }) : t("empty")}
          </span>
          <button
            type="button"
            onClick={paste}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-surface-3 px-3.5 text-[15px] font-semibold text-text"
          >
            <ClipboardPaste className="size-[18px]" aria-hidden />
            {t("paste")}
          </button>
        </div>
      </div>
      <FieldError message={errorText(errors.example)} />

      <div className="flex items-start gap-2.5 rounded-2xl bg-surface-2 px-4 py-3.5">
        <Lock className="mt-px size-[18px] flex-none text-text-2" aria-hidden />
        <span className="text-[13px] leading-[1.45] text-text-2">{t("privacy")}</span>
      </div>
    </>
  );
}
