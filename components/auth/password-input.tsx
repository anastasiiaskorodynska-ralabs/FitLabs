"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput(props: React.ComponentProps<"input">) {
  const t = useTranslations("SignIn");
  const [visible, setVisible] = useState(false);

  return (
    <span className="flex h-14 items-center rounded-[14px] border-[1.5px] border-line-strong bg-surface-1 pr-1 pl-4 focus-within:border-2 focus-within:border-brand focus-within:shadow-[0_0_0_4px_var(--brand-tint)]">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className="min-w-0 flex-1 bg-transparent text-[17px] font-medium text-text outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        className="flex size-11 items-center justify-center rounded-[10px] text-text-2"
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </span>
  );
}
