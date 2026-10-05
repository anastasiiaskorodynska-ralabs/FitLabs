"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { PrimaryButton } from "@/components/bottom-sheet";
import type { Example } from "@/lib/examples/schema";
import { ExampleCard } from "./example-card";
import { ExampleMenuSheet } from "./example-menu-sheet";
import { ExampleSheet } from "./example-sheet";

type Open = { kind: "add" } | { kind: "edit"; example: Example } | { kind: "menu"; example: Example };

export function ExamplesView({ examples }: { examples: Example[] }) {
  const t = useTranslations("Examples");
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);

  const titleOf = (e: Example) => e.title ?? e.rawText.split("\n").find((l) => l.trim()) ?? "";

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle", { count: examples.length })} />

      <div className="flex flex-1 flex-col gap-3 px-5 pt-4 pb-5">
        {examples.length === 0 ? (
          <p className="px-3 py-10 text-center text-[15px] leading-[1.45] text-text-2">{t("emptyList")}</p>
        ) : (
          examples.map((example) => (
            <ExampleCard
              key={example.id}
              example={example}
              onOpen={() => setOpen({ kind: "edit", example })}
              onMore={() => setOpen({ kind: "menu", example })}
            />
          ))
        )}
      </div>

      <div className="sticky bottom-0 flex-none bg-bg px-5 pt-2.5 pb-3">
        <PrimaryButton onClick={() => setOpen({ kind: "add" })} className="min-h-14 rounded-2xl">
          <Plus className="size-5" aria-hidden />
          {t("add")}
        </PrimaryButton>
      </div>

      {open?.kind === "add" && <ExampleSheet onClose={close} />}
      {open?.kind === "edit" && <ExampleSheet example={open.example} onClose={close} />}
      {open?.kind === "menu" && (
        <ExampleMenuSheet
          example={open.example}
          title={titleOf(open.example)}
          onEdit={() => setOpen({ kind: "edit", example: open.example })}
          onClose={close}
        />
      )}
    </>
  );
}
