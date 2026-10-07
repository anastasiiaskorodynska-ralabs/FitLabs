"use client";

import { useTranslations } from "next-intl";
import { Check, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Small controls from the FitLabs design system, shared by the onboarding steps.

export function StepIntro({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.01em]">{title}</h1>
      <p className="text-[15px] leading-[1.45] text-text-2">{sub}</p>
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[15px] font-semibold text-text-2">{children}</span>;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium text-danger">
      {message}
    </p>
  );
}

export const inputClass =
  "h-14 rounded-[14px] border-[1.5px] border-line-strong bg-surface-1 px-4 text-[17px] font-medium text-text outline-none focus:border-2 focus:border-brand focus:shadow-[0_0_0_4px_var(--brand-tint)]";

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid gap-1 rounded-2xl bg-surface-2 p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-12 rounded-xl text-[15px] font-semibold",
              active ? "bg-surface-1 text-text" : "text-text-2",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RadioDot({ on, size = 24 }: { on: boolean; size?: number }) {
  return (
    <span
      className={cn(
        "flex flex-none items-center justify-center rounded-full text-on-brand",
        on ? "bg-brand" : "border-2 border-line-strong",
      )}
      style={{ width: size, height: size }}
    >
      {on && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

export function RadioCard({
  on,
  onClick,
  title,
  hint,
  icon,
  large,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  hint: string;
  icon?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex items-center text-left text-text active:scale-[.99]",
        large ? "min-h-[104px] gap-4 rounded-[22px] p-[18px]" : "min-h-15 gap-3 rounded-2xl px-4 py-2.5",
        on ? "border-2 border-brand bg-brand-tint" : "border border-line bg-surface-1",
      )}
    >
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("font-bold", large ? "text-xl" : "text-base")}>{title}</span>
        <span className={cn("leading-snug text-text-2", large ? "text-sm" : "text-[13px]")}>{hint}</span>
      </span>
      <RadioDot on={on} size={large ? 28 : 24} />
    </button>
  );
}

export function CheckRow({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      className="flex min-h-14 items-center gap-3.5 border-b border-line px-4 text-left text-base font-semibold text-text last:border-b-0"
    >
      <span
        className={cn(
          "flex size-[26px] flex-none items-center justify-center rounded-lg text-on-brand",
          on ? "bg-brand" : "border-2 border-line-strong",
        )}
      >
        {on && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

export function NumberStepper({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("Onboarding");
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] border border-line bg-surface-1 px-1.5 py-3">
      <span className="text-[13px] font-semibold text-text-2">{label}</span>
      <span className="flex items-baseline gap-[3px]">
        <input
          inputMode="numeric"
          aria-label={label}
          value={Number.isNaN(value) ? "" : String(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
            onChange(digits ? Number(digits) : NaN);
          }}
          className="w-[2.2em] bg-transparent text-right text-[32px] leading-none font-extrabold tracking-[-0.02em] outline-none"
        />
        <span className="text-[13px] font-semibold text-text-3">{unit}</span>
      </span>
      <div className="flex gap-1.5">
        <button
          type="button"
          aria-label={t("decrease", { label })}
          onClick={() => onChange(clamp((Number.isNaN(value) ? min : value) - step))}
          className="flex size-11 items-center justify-center rounded-xl bg-surface-3 text-text"
        >
          <Minus className="size-5" />
        </button>
        <button
          type="button"
          aria-label={t("increase", { label })}
          onClick={() => onChange(clamp((Number.isNaN(value) ? min : value) + step))}
          className="flex size-11 items-center justify-center rounded-xl bg-surface-3 text-text"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTranslations("Onboarding");
  return (
    <span className="flex min-h-11 items-center gap-1 rounded-full border border-line-strong bg-surface-2 pr-1.5 pl-3.5 text-[15px] font-semibold">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("remove", { label })}
        className="flex size-9 items-center justify-center rounded-full text-text-2"
      >
        <X className="size-4" />
      </button>
    </span>
  );
}

export function AddInput({
  value,
  onChange,
  onAdd,
  placeholder,
  addLabel,
  dashed,
}: {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
  addLabel: React.ReactNode;
  dashed?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        enterKeyHint="done"
        className={cn(inputClass, "min-w-0 flex-1", dashed && "border-dashed bg-transparent")}
      />
      <button
        type="button"
        onClick={onAdd}
        className="flex min-h-14 min-w-14 flex-none items-center justify-center gap-1.5 rounded-[14px] bg-surface-3 px-4 text-[15px] font-semibold text-text"
      >
        {addLabel}
      </button>
    </div>
  );
}
