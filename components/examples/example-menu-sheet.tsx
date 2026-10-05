"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { deleteExample } from "@/app/(tabs)/examples/actions";
import { BottomSheet } from "@/components/bottom-sheet";
import { FieldError } from "@/components/onboarding/controls";
import type { Example } from "@/lib/examples/schema";

// "More" menu for an example: edit, or delete after a confirmation.
export function ExampleMenuSheet({
  example,
  title,
  onEdit,
  onClose,
}: {
  example: Example;
  title: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("Examples");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [deleting, startDeleting] = useTransition();

  const remove = () =>
    startDeleting(async () => {
      const result = await deleteExample(example.id);
      if (result.ok) onClose();
      else setError(t(`errors.${result.error}`));
    });

  const rowClass =
    "flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left text-[17px] font-semibold";

  return (
    <BottomSheet open onClose={onClose} title={confirming ? t("deleteTitle") : title}>
      {confirming ? (
        <>
          <p className="text-[15px] leading-[1.45] text-text-2">{t("deleteBody")}</p>
          <FieldError message={error} />
          <div className="flex flex-col gap-2 pb-2">
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="min-h-14 rounded-2xl bg-danger text-[17px] font-bold text-white disabled:opacity-60"
            >
              {t("deleteConfirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-14 rounded-2xl bg-surface-3 text-[17px] font-semibold text-text"
            >
              {t("cancel")}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1 pb-2">
          <button type="button" onClick={onEdit} className={`${rowClass} bg-surface-2 text-text`}>
            <Pencil className="size-5 text-text-2" aria-hidden />
            {t("edit")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`${rowClass} text-danger`}
          >
            <Trash2 className="size-5" aria-hidden />
            {t("delete")}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
