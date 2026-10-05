import { getLocale } from "next-intl/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileView } from "@/components/profile/profile-view";
import { requireUser } from "@/lib/auth";
import { loadProfileDraft } from "@/lib/profile/data";

export default async function ProfilePage() {
  const { supabase, claims } = await requireUser();
  const { draft, equipment } = await loadProfileDraft(supabase, await getLocale());

  return (
    <ProfileView
      email={typeof claims.email === "string" ? claims.email : ""}
      draft={draft}
      equipment={equipment}
      signOut={<SignOutButton />}
    />
  );
}
