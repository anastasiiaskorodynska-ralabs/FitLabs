"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, CircleX, Dumbbell, ExternalLink, ImageIcon } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { DAY_TYPE_STYLE, type DayType } from "@/lib/day-types";
import type { LibraryExercise } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";

// YouTube watch/short/share links become embeddable; other URLs play as video files.
function youtubeEmbed(url: string) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

const youtubeSearch = (name: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise technique`)}`;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-bold tracking-[0.06em] text-text-3 uppercase">{children}</h3>
  );
}

export function ExerciseInfoSheet({
  exercise,
  dayType,
  onClose,
}: {
  exercise: LibraryExercise;
  dayType: DayType;
  onClose: () => void;
}) {
  const t = useTranslations("Session.info");
  const tM = useTranslations("Muscles");
  const [slide, setSlide] = useState(0);
  const equipmentText = exercise.equipment.length
    ? exercise.equipment.map((e) => e.name).join(" · ")
    : t("bodyweight");
  const embed = exercise.videoUrl ? youtubeEmbed(exercise.videoUrl) : null;
  const slides = exercise.images.length ? exercise.images : [null];

  return (
    <BottomSheet open tall onClose={onClose} eyebrow={equipmentText} title={exercise.name}>
      <div className="flex flex-none flex-col gap-2.5">
        <div
          onScroll={(e) => {
            const el = e.currentTarget;
            setSlide(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-[20px] [scrollbar-width:none]"
        >
          {slides.map((src, i) =>
            src ? (
              // eslint-disable-next-line @next/next/no-img-element -- library images may come from any host
              <img
                key={src}
                src={src}
                alt={t("imageAlt", { name: exercise.name, n: i + 1 })}
                className="h-[230px] w-full flex-none snap-start rounded-[20px] bg-surface-2 object-contain"
              />
            ) : (
              <div
                key="placeholder"
                className="flex h-[230px] w-full flex-none snap-start flex-col items-center justify-center gap-2 rounded-[20px] bg-[repeating-linear-gradient(135deg,var(--surface-3)_0_10px,var(--surface-2)_10px_20px)] text-text-3"
              >
                <ImageIcon className="size-9" aria-hidden />
                <span className="text-[13px] font-semibold">{t("noImages")}</span>
              </div>
            ),
          )}
        </div>
        {slides.length > 1 && (
          <div className="flex justify-center gap-1.5" aria-hidden>
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-[width]",
                  i === slide ? "w-5 bg-text" : "w-1.5 bg-line-strong",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-none flex-col gap-2.5">
        {exercise.videoUrl &&
          (embed ? (
            <iframe
              src={embed}
              title={t("video", { name: exercise.name })}
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full rounded-[20px] bg-surface-3"
            />
          ) : (
            <video src={exercise.videoUrl} controls playsInline className="w-full rounded-[20px] bg-surface-3" />
          ))}
        {!exercise.videoUrl && (
          <a
            href={youtubeSearch(exercise.nameEn)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-line-strong text-[15px] font-semibold text-text"
          >
            <ExternalLink className="size-[18px]" aria-hidden />
            {t("youtube")}
          </a>
        )}
      </div>

      {exercise.technique.length > 0 && (
        <section className="flex flex-none flex-col gap-3">
          <SectionTitle>{t("technique")}</SectionTitle>
          <ol className="flex flex-col gap-3">
            {exercise.technique.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-surface-3 text-sm font-extrabold">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-base leading-[1.45]">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="flex flex-none flex-col gap-2.5">
        <SectionTitle>{t("muscles")}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {exercise.muscles.map((m) => (
            <span
              key={m}
              className={cn("flex min-h-9 items-center rounded-full px-3.5 text-sm font-bold", DAY_TYPE_STYLE[dayType].tint)}
            >
              {tM(m)}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-none flex-col gap-2.5 pb-4">
        <SectionTitle>{t("equipment")}</SectionTitle>
        {(exercise.equipment.length ? exercise.equipment : [{ name: t("bodyweight"), available: true }]).map((q) => (
          <div
            key={q.name}
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface-2 px-4 text-base font-semibold"
          >
            <Dumbbell className="size-5 text-text-2" aria-hidden />
            {q.name}
            {q.available ? (
              <CircleCheck className="ml-auto size-5 text-done" aria-label={t("available")} />
            ) : (
              <CircleX className="ml-auto size-5 text-danger" aria-label={t("unavailable")} />
            )}
          </div>
        ))}
      </section>
    </BottomSheet>
  );
}
