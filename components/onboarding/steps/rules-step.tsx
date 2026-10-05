"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  AddInput,
  FieldError,
  FieldLabel,
  RemovableChip,
  StepIntro,
  SwitchRow,
  inputClass,
} from "../controls";
import type { StepProps } from "../types";

export function RulesStep({ draft, update, errors, errorText, hideIntro }: StepProps) {
  const t = useTranslations("Onboarding.rules");
  const [input, setInput] = useState("");

  const addAvoid = () => {
    const value = input.trim();
    if (!value) return;
    const exists = draft.avoid.some((a) => a.toLowerCase() === value.toLowerCase());
    if (!exists) update({ avoid: [...draft.avoid, value] });
    setInput("");
  };

  return (
    <>
      {!hideIntro && <StepIntro title={t("title")} sub={t("sub")} />}

      <div className="flex flex-none flex-col overflow-hidden rounded-[20px] border border-line bg-surface-1">
        <SwitchRow
          on={draft.noWarmup}
          onToggle={() => update({ noWarmup: !draft.noWarmup })}
          title={t("noWarmup.label")}
          hint={t("noWarmup.hint")}
        />
        <SwitchRow
          on={draft.absFinisher}
          onToggle={() => update({ absFinisher: !draft.absFinisher })}
          title={t("absFinisher.label")}
          hint={t("absFinisher.hint")}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <FieldLabel>{t("avoid")}</FieldLabel>
        {draft.avoid.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {draft.avoid.map((label) => (
              <RemovableChip
                key={label}
                label={label}
                onRemove={() => update({ avoid: draft.avoid.filter((a) => a !== label) })}
              />
            ))}
          </div>
        )}
        <AddInput
          value={input}
          onChange={setInput}
          onAdd={addAvoid}
          placeholder={t("avoidPlaceholder")}
          addLabel={<Plus className="size-6" aria-label={t("add")} />}
        />
        <FieldError message={errorText(errors.avoid)} />
      </div>

      <label className="flex flex-col gap-2">
        <FieldLabel>{t("notes")}</FieldLabel>
        <textarea
          rows={4}
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder={t("notesPlaceholder")}
          className={`${inputClass} h-auto resize-none py-3.5 leading-[1.45]`}
        />
        <FieldError message={errorText(errors.notes)} />
      </label>
    </>
  );
}
