import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/auth/sign-in-form";
import { LocaleSwitch } from "@/components/locale-switch";
import { safeNext } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("SignIn");
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? safeNext(next) : undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <span className="text-xl font-extrabold tracking-[-0.01em]">{t("brand")}</span>
        <LocaleSwitch />
      </header>

      <main className="flex flex-1 flex-col gap-7 px-5 pt-14">
        <div className="flex flex-col gap-2">
          <h1 className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.02em] text-balance">
            {t("welcome")}
          </h1>
          <p className="text-[17px] leading-[1.45] text-text-2 text-pretty">{t("sub")}</p>
        </div>
        <SignInForm next={nextPath} linkError={error === "link"} />
      </main>

      <p className="px-8 pt-8 pb-[max(40px,env(safe-area-inset-bottom))] text-center text-[13px] leading-snug text-text-3">
        {t("invite")}
      </p>
    </div>
  );
}
