"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ClipboardPaste } from "lucide-react";
import { createExample, updateExample } from "@/app/(tabs)/examples/actions";
import { BottomSheet, PrimaryButton } from "@/components/bottom-sheet";
import { FieldError, FieldLabel, inputClass } from "@/components/onboarding/controls";
import { DAY_TYPE_STYLE } from "@/lib/day-types";
import { exampleSchema, type Example, type ExampleDraft } from "@/lib/examples/schema";
import { DAY_TYPES, fieldErrors, type FieldErrors } from "@/lib/onboarding/schema";
import { cn } from "@/lib/utils";

// Add or edit an example ("Add example" sheet in /design).
export function ExampleSheet({ example, onClose }: { example?: Example; onClose: () => void }) {
  const t = useTranslations("Examples");
  const tTypes = useTranslations("DayTypes");
  const [draft, setDraft] = useState<ExampleDraft>({
    dayType: example ? example.dayType : "upper",
    title: example?.title ?? "",
    rawText: example?.rawText ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const update = (patch: Partial<ExampleDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  };

  const lines = draft.rawText.split("\n").filter((l) => l.trim()).length;
  const errorText = (key?: string) =>
    key ? (t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.invalid")) : undefined;

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) update({ rawText: draft.rawText ? `${draft.rawText}\n${text}` : text });
    } catch {
      // Clipboard permission denied: long-press paste still works.
    }
  };

  const save = () => {
    const found = fieldErrors(exampleSchema, draft);
    if (found) {
      setErrors(found);
      return;
    }
    setSaveError(undefined);
    startSaving(async () => {
      const result = example ? await updateExample(example.id, draft) : await createExample(draft);
      if (result.ok) onClose();
      else setSaveError(t(`errors.${result.error}`));
    });
  };

  return (
    <BottomSheet
      open
      tall
      onClose={onClose}
      title={example ? t("editTitle") : t("addTitle")}
      footer={
        <>
          <FieldError message={saveError} />
          <PrimaryButton onClick={save} disabled={saving || lines === 0}>
            {saving ? t("saving") : t("save")}
          </PrimaryButton>
        </>
      }
    >
      <div className="flex flex-none flex-col gap-2">
        <FieldLabel>{t("dayType")}</FieldLabel>
        <div role="radiogroup" aria-label={t("dayType")} className="grid grid-cols-2 gap-2">
          {DAY_TYPES.map((type) => {
            const on = draft.dayType === type;
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => update({ dayType: type })}
                className={cn(
                  "flex min-h-[52px] items-center gap-2.5 rounded-[14px] border-[1.5px] px-3.5 text-left text-[15px] font-bold",
                  on ? DAY_TYPE_STYLE[type].picked : "border-line text-text-2",
                )}
              >
                <span className={cn("size-2.5 flex-none rounded-full", DAY_TYPE_STYLE[type].dot)} />
                {tTypes(`long.${type}`)}
              </button>
            );
          })}
        </div>
        <FieldError message={errorText(errors.dayType)} />
      </div>

      <label className="flex flex-none flex-col gap-2">
        <FieldLabel>
          {t("name")} <span className="font-medium text-text-3">{t("optional")}</span>
        </FieldLabel>
        <input
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={t("namePlaceholder")}
          className={cn(inputClass, "h-[52px] px-3.5")}
        />
        <FieldError message={errorText(errors.title)} />
      </label>

      <div className="flex flex-[1_0_280px] flex-col gap-2">
        <FieldLabel>{t("workout")}</FieldLabel>
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border-[1.5px] border-line-strong bg-surface-1 focus-within:border-2 focus-within:border-brand focus-within:shadow-[0_0_0_4px_var(--brand-tint)]">
          <textarea
            value={draft.rawText}
            onChange={(e) => update({ rawText: e.target.value })}
            placeholder={t("placeholder")}
            aria-label={t("workout")}
            className="min-h-[200px] flex-1 resize-none bg-transparent px-4 py-3.5 text-[17px] leading-normal font-medium text-text outline-none"
          />
          <div className="flex items-center justify-between gap-2 border-t border-line py-1.5 pr-1.5 pl-3.5">
            <span className="text-[13px] text-text-3">
              {lines
                ? t("meta", {
                    count: lines,
                    type: draft.dayType ? tTypes(`long.${draft.dayType}`) : t("untagged"),
                  })
                : t("empty")}
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
        <FieldError message={errorText(errors.rawText)} />
      </div>
    </BottomSheet>
  );
}
