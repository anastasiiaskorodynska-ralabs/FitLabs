"use client";

import "./globals.css";

// Last-resort boundary when the root layout itself fails, so translations and
// providers may be unavailable: a short bilingual message is all it shows.
// check-messages: allow-hardcoded
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-bg px-5 text-center text-text">
        <main className="flex max-w-[400px] flex-col items-center gap-5">
          <h1 className="text-2xl font-extrabold">FitLabs</h1>
          <p className="text-base text-text-2">
            Something went wrong. / Щось пішло не так.
          </p>
          <button
            type="button"
            onClick={reset}
            className="min-h-14 w-full rounded-2xl bg-brand px-6 text-[17px] font-bold text-on-brand"
          >
            Try again / Спробувати ще раз
          </button>
        </main>
      </body>
    </html>
  );
}
