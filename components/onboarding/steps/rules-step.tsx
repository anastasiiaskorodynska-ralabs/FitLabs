"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AddInput, FieldError, FieldLabel, RemovableChip, StepIntro } from "../controls";
import { RuleList } from "../rule-list";
import type { StepProps } from "../types";

// Free-text rules (followed by the AI) and the avoid list (enforced in code).
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
      {hideIntro && <p className="-mt-1 text-[15px] leading-[1.45] text-text-2">{t("sub")}</p>}

      <div className="flex flex-col gap-2">
        <RuleList rules={draft.rules} onChange={(rules) => update({ rules })} suggestions={t.raw("suggestions") as string[]} />
        <FieldError message={errorText(errors.rules)} />
      </div>

      <div className="flex flex-col gap-2.5 border-t border-line pt-4">
        <FieldLabel>{t("avoid")}</FieldLabel>
        <p className="-mt-1 text-[13px] leading-snug text-text-3">{t("avoidHint")}</p>
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
    </>
  );
}
