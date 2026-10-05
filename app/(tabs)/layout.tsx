import { redirect } from "next/navigation";
import { TabBar } from "@/components/app-shell/tab-bar";
import { isOnboarded, requireUser } from "@/lib/auth";

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  if (!(await isOnboarded())) redirect("/onboarding");

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-bg">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
      <TabBar />
    </div>
  );
}
