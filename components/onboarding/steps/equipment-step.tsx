"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { AddInput, CheckRow, FieldError, StepIntro } from "../controls";
import type { EquipmentCategory, EquipmentItem, StepProps } from "../types";

const CATEGORIES: EquipmentCategory[] = ["free_weights", "machines", "cables", "accessories", "cardio"];

// Custom items not saved yet are keyed by name; saved ones by id.
type Row = { key: string; label: string; on: boolean; toggle: () => void };

export function EquipmentStep({
  draft,
  update,
  errors,
  errorText,
  hideIntro,
  equipment,
}: StepProps & { equipment: EquipmentItem[] }) {
  const t = useTranslations("Onboarding.equipment");
  const [input, setInput] = useState("");
  const selected = new Set(draft.equipmentIds);

  const toggleId = (id: string) =>
    update({
      equipmentIds: selected.has(id)
        ? draft.equipmentIds.filter((x) => x !== id)
        : [...draft.equipmentIds, id],
    });

  const addCustom = () => {
    const value = input.trim();
    if (!value) return;
    const lower = value.toLowerCase();
    const known = equipment.find((e) => e.name.toLowerCase() === lower);
    if (known) {
      if (!selected.has(known.id)) toggleId(known.id);
    } else if (!draft.custom.some((c) => c.toLowerCase() === lower)) {
      update({ custom: [...draft.custom, value] });
    }
    setInput("");
  };

  const groups = CATEGORIES.map((category) => {
    const rows: Row[] = equipment
      .filter((e) => e.category === category)
      .map((e) => ({ key: e.id, label: e.name, on: selected.has(e.id), toggle: () => toggleId(e.id) }));
    if (category === "accessories") {
      rows.push(
        ...draft.custom.map((name) => ({
          key: `custom:${name}`,
          label: name,
          on: true,
          toggle: () => update({ custom: draft.custom.filter((c) => c !== name) }),
        })),
      );
    }
    return { category, rows };
  }).filter((g) => g.rows.length > 0);

  const setGroup = (rows: Row[], on: boolean) => {
    const ids = rows.filter((r) => !r.key.startsWith("custom:")).map((r) => r.key);
    const next = new Set(draft.equipmentIds);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    update({ equipmentIds: [...next], ...(on ? {} : { custom: [] }) });
  };

  return (
    <>
      {!hideIntro && <StepIntro title={t("title")} sub={t("sub")} />}

      {groups.map(({ category, rows }) => {
        const count = rows.filter((r) => r.on).length;
        const all = count === rows.length;
        return (
          <section key={category} className="flex flex-none flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-bold tracking-[0.06em] text-text-3 uppercase">
                {t(`categories.${category}`)} · {count}/{rows.length}
              </h2>
              <button
                type="button"
                onClick={() => setGroup(rows, !all)}
                className="min-h-11 px-1 text-[15px] font-semibold text-brand-text"
              >
                {all ? t("clear") : t("selectAll")}
              </button>
            </div>
            <div className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface-1">
              {rows.map((r) => (
                <CheckRow key={r.key} on={r.on} onToggle={r.toggle} label={r.label} />
              ))}
            </div>
          </section>
        );
      })}

      <AddInput
        dashed
        value={input}
        onChange={setInput}
        onAdd={addCustom}
        placeholder={t("customPlaceholder")}
        addLabel={
          <>
            <Plus className="size-5" aria-hidden />
            {t("add")}
          </>
        }
      />
      <FieldError message={errorText(errors.custom)} />
    </>
  );
}
