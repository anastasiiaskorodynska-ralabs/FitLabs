"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Dumbbell, Languages, ListChecks, UserRound } from "lucide-react";
import {
  saveEquipment,
  savePersonal,
  saveRules,
  saveSchedule,
} from "@/app/(tabs)/profile/actions";
import { LocaleSwitch } from "@/components/locale-switch";
import { AboutStep } from "@/components/onboarding/steps/about-step";
import { EquipmentStep } from "@/components/onboarding/steps/equipment-step";
import { GoalStep } from "@/components/onboarding/steps/goal-step";
import { RulesStep } from "@/components/onboarding/steps/rules-step";
import type { EquipmentItem } from "@/components/onboarding/types";
import { DAY_TYPE_STYLE } from "@/lib/day-types";
import {
  aboutSchema,
  equipmentSchema,
  goalSchema,
  rulesSchema,
  scheduleSchema,
  type OnboardingDraft,
} from "@/lib/onboarding/schema";
import { ProfileSection, type SectionLine } from "./profile-section";
import { ScheduleEditor } from "./schedule-editor";
import { SectionSheet } from "./section-sheet";

type Section = "personal" | "schedule" | "rules" | "equipment";

const personalSchema = aboutSchema.extend(goalSchema.shape);
const NAMES_SHOWN = 6;
const RULES_SHOWN = 3;

export function ProfileView({
  email,
  draft,
  equipment,
  signOut,
}: {
  email: string;
  draft: OnboardingDraft;
  equipment: EquipmentItem[];
  signOut: React.ReactNode;
}) {
  const t = useTranslations("Profile");
  const tAbout = useTranslations("Onboarding.about");
  const tGoal = useTranslations("Onboarding.goal");
  const tDays = useTranslations("Days");
  const tTypes = useTranslations("DayTypes");
  const [editing, setEditing] = useState<Section | null>(null);
  const close = () => setEditing(null);

  const selectedNames = equipment
    .filter((e) => draft.equipmentIds.includes(e.id))
    .map((e) => e.name);

  const sections: { key: Section; icon: typeof UserRound; lines: SectionLine[] }[] = [
    {
      key: "personal",
      icon: UserRound,
      lines: [
        { text: t("body", { age: draft.age, height: draft.height, weight: draft.weight }) },
        {
          text: t("levelGoal", {
            level: tAbout(`levels.${draft.level}.label`),
            goal: draft.goal ? tGoal(`options.${draft.goal}.label`) : "—",
          }),
        },
      ],
    },
    {
      key: "schedule",
      icon: CalendarDays,
      lines: [
        ...draft.days.map((d) => ({
          text: `${tDays(`short.${d.weekday}`)} · ${tTypes(`long.${d.dayType}`)}`,
          dot: DAY_TYPE_STYLE[d.dayType].dot,
        })),
        { text: t("sessions", { minutes: draft.sessionLength }) },
      ],
    },
    {
      key: "rules",
      icon: ListChecks,
      lines: [
        ...draft.rules.slice(0, RULES_SHOWN).map((text) => ({ text, dot: "bg-brand" })),
        draft.rules.length > RULES_SHOWN && { text: t("rules.more", { count: draft.rules.length - RULES_SHOWN }) },
        draft.avoid.length > 0 && { text: t("rules.avoid", { list: draft.avoid.join(", ") }) },
      ].filter((l): l is SectionLine => Boolean(l)),
    },
    {
      key: "equipment",
      icon: Dumbbell,
      lines: [
        { text: t("equipmentCount", { count: selectedNames.length }) },
        ...(selectedNames.length
          ? [
              {
                text:
                  selectedNames.slice(0, NAMES_SHOWN).join(", ") +
                  (selectedNames.length > NAMES_SHOWN ? ` +${selectedNames.length - NAMES_SHOWN}` : ""),
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-6">
      <header className="flex items-center gap-3.5 pb-1.5">
        <span
          aria-hidden
          className="flex size-15 flex-none items-center justify-center rounded-full bg-brand-tint text-2xl font-extrabold text-brand-text"
        >
          {(draft.name.trim()[0] ?? "?").toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="truncate text-[26px] font-extrabold tracking-[-0.01em]">
            {draft.name || t("title")}
          </h1>
          <span className="truncate text-sm text-text-2">{email}</span>
        </div>
      </header>

      {sections.map((s) => (
        <ProfileSection
          key={s.key}
          icon={s.icon}
          title={t(`sections.${s.key}`)}
          lines={s.lines.length ? s.lines : [{ text: t("rules.none") }]}
          editLabel={t("edit")}
          onEdit={() => setEditing(s.key)}
        />
      ))}

      <div className="flex flex-none items-center gap-3 rounded-[20px] border border-line bg-surface-1 py-2.5 pr-2.5 pl-4">
        <Languages className="size-[19px] text-text-2" aria-hidden />
        <span className="flex-1 text-[17px] font-bold">{t("language")}</span>
        <LocaleSwitch className="border-0" />
      </div>

      {signOut}

      {editing === "personal" && (
        <SectionSheet tall title={t("sections.personal")} initial={draft} schema={personalSchema} save={savePersonal} onClose={close}>
          {(props) => (
            <>
              <AboutStep {...props} />
              <GoalStep {...props} />
            </>
          )}
        </SectionSheet>
      )}
      {editing === "schedule" && (
        <SectionSheet title={t("sections.schedule")} initial={draft} schema={scheduleSchema} save={saveSchedule} onClose={close}>
          {(props) => <ScheduleEditor {...props} />}
        </SectionSheet>
      )}
      {editing === "rules" && (
        <SectionSheet tall title={t("sections.rules")} initial={draft} schema={rulesSchema} save={saveRules} onClose={close}>
          {(props) => <RulesStep {...props} />}
        </SectionSheet>
      )}
      {editing === "equipment" && (
        <SectionSheet tall title={t("sections.equipment")} initial={draft} schema={equipmentSchema} save={saveEquipment} onClose={close}>
          {(props) => <EquipmentStep {...props} equipment={equipment} />}
        </SectionSheet>
      )}
    </div>
  );
}
