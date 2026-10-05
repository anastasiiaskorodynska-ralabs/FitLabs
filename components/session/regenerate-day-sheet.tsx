"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoaderCircle, Sparkles } from "lucide-react";
import { BottomSheet, PrimaryButton } from "@/components/bottom-sheet";
import { FieldError, inputClass } from "@/components/onboarding/controls";
import { cn } from "@/lib/utils";
import { postAi } from "./ai-request";

// "Regenerate whole day" (or "Generate with AI" for an empty session).
export function RegenerateDaySheet({
  sessionId,
  empty,
  onClose,
}: {
  sessionId: string;
  empty: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Session.ai");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const run = async () => {
    setBusy(true);
    setError(undefined);
    const result = await postAi("/api/regenerate-day", { sessionId, reason: reason.trim() || undefined });
    if (result.ok) {
      router.refresh();
      onClose();
      return;
    }
    setError(t.has(`errors.${result.code}`) ? t(`errors.${result.code}`) : t("errors.failed"));
    setBusy(false);
  };

  return (
    <BottomSheet
      open
      onClose={busy ? () => {} : onClose}
      title={empty ? t("generateDay") : t("regenerateDay")}
      footer={
        <>
          <FieldError message={error} />
          <PrimaryButton onClick={run} disabled={busy}>
            {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
            {busy ? t("working") : empty ? t("generate") : t("regenerate")}
          </PrimaryButton>
        </>
      }
    >
      <p className="text-[15px] leading-[1.45] text-text-2">{empty ? t("generateBody") : t("regenerateBody")}</p>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold text-text-2">
          {t("wish")} <span className="font-medium text-text-3">{t("optional")}</span>
        </span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          disabled={busy}
          placeholder={t("wishPlaceholder")}
          className={cn(inputClass, "h-[52px] px-3.5 text-base")}
        />
      </label>
      {busy && <p className="text-[13px] text-text-3" aria-live="polite">{t("dayTime")}</p>}
    </BottomSheet>
  );
}
