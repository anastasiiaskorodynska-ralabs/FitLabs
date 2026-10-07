"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Plus, X } from "lucide-react";
import { AddInput } from "./controls";

const MAX_SUGGESTIONS = 3;

// The user's own training rules: tap a rule to edit it, × to remove it,
// add new ones by typing or from the quick-add suggestions.
export function RuleList({
  rules,
  onChange,
  suggestions,
}: {
  rules: string[];
  onChange: (rules: string[]) => void;
  suggestions: string[];
}) {
  const t = useTranslations("Onboarding.rules");
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null);

  const has = (text: string, except?: number) =>
    rules.some((r, i) => i !== except && r.trim().toLowerCase() === text.trim().toLowerCase());

  const add = (text: string) => {
    const value = text.trim();
    if (value && !has(value)) onChange([...rules, value]);
  };

  const commitEdit = () => {
    if (!editing) return;
    const value = editing.text.trim();
    if (!value) onChange(rules.filter((_, i) => i !== editing.index));
    else if (!has(value, editing.index)) onChange(rules.map((r, i) => (i === editing.index ? value : r)));
    setEditing(null);
  };

  const remaining = suggestions.filter((s) => !has(s)).slice(0, MAX_SUGGESTIONS);

  return (
    <div className="flex flex-col gap-2.5">
      {rules.length > 0 && (
        <ul className="flex flex-none flex-col overflow-hidden rounded-[20px] border border-line bg-surface-1">
          {rules.map((rule, i) => (
            <li key={`${i}-${rule}`} className="flex min-h-14 items-center gap-2.5 border-b border-line py-1.5 pr-1.5 pl-4 last:border-b-0">
              <span className="size-2 flex-none rounded-full bg-brand" aria-hidden />
              {editing?.index === i ? (
                <>
                  <input
                    autoFocus
                    value={editing.text}
                    maxLength={200}
                    onChange={(e) => setEditing({ index: i, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    onBlur={commitEdit}
                    aria-label={t("editRule")}
                    className="min-w-0 flex-1 bg-transparent py-2 text-[15px] leading-[1.4] text-text outline-none"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={commitEdit}
                    aria-label={t("doneEditing")}
                    className="flex size-11 flex-none items-center justify-center rounded-xl text-brand-text"
                  >
                    <Check className="size-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing({ index: i, text: rule })}
                    aria-label={t("editNamed", { rule })}
                    className="min-w-0 flex-1 py-2 text-left text-[15px] leading-[1.4] text-text"
                  >
                    {rule}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(rules.filter((_, k) => k !== i))}
                    aria-label={t("removeNamed", { rule })}
                    className="flex size-11 flex-none items-center justify-center rounded-xl text-text-2"
                  >
                    <X className="size-[18px]" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <AddInput
        value={input}
        onChange={setInput}
        onAdd={() => {
          add(input);
          setInput("");
        }}
        placeholder={t("rulePlaceholder")}
        addLabel={<Plus className="size-6" aria-label={t("add")} />}
      />

      {remaining.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-text-3">{t("quickAdd")}</span>
          <div className="flex flex-wrap gap-2">
            {remaining.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-line-strong px-3.5 text-sm font-semibold text-text-2"
              >
                <Plus className="size-4" aria-hidden />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
