import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";

export async function SignOutButton() {
  const t = await getTranslations("Profile");

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-line-strong text-base font-semibold text-danger"
      >
        <LogOut className="size-[19px]" aria-hidden />
        {t("signOut")}
      </button>
    </form>
  );
}
