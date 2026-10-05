"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateBlock } from "@/app/session/actions";
import { BottomSheet, PrimaryButton } from "@/components/bottom-sheet";
import { FieldError, NumberStepper } from "@/components/onboarding/controls";
import type { Block } from "@/lib/sessions/types";

const REST_STEP = 15;

// Rest (and rounds for circuits) of one block.
export function BlockSheet({ block, title, onClose }: { block: Block; title: string; onClose: () => void }) {
  const t = useTranslations("Session.block");
  const tErr = useTranslations("Session.errors");
  const [rounds, setRounds] = useState(block.rounds ?? 3);
  const [rest, setRest] = useState(block.restSec ?? 60);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const isCircuit = block.kind === "circuit";

  const save = () =>
    startSaving(async () => {
      const result = await updateBlock(block.id, {
        rounds: isCircuit ? rounds : null,
        restSec: Math.max(0, Math.round(rest / REST_STEP) * REST_STEP),
      });
      if (result.ok) onClose();
      else setError(tErr(result.error));
    });

  return (
    <BottomSheet
      open
      onClose={onClose}
      eyebrow={t("eyebrow")}
      title={title}
      footer={
        <>
          <FieldError message={error} />
          <PrimaryButton onClick={save} disabled={saving}>
            {t("save")}
          </PrimaryButton>
        </>
      }
    >
      <div className={isCircuit ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
        {isCircuit && (
          <NumberStepper label={t("rounds")} unit="" value={rounds} min={1} max={20} onChange={setRounds} />
        )}
        <NumberStepper
          label={t(isCircuit ? "restRounds" : block.kind === "superset" ? "restSuperset" : "restSets")}
          unit={t("sec")}
          value={rest}
          min={0}
          max={600}
          step={REST_STEP}
          onChange={setRest}
        />
      </div>
      <p className="text-[13px] text-text-3">{t("hint")}</p>
    </BottomSheet>
  );
}
