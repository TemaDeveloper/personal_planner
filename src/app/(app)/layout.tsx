import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SectionsProvider } from "@/components/providers/sections-provider";
import { DEFAULT_ENABLED_SECTIONS } from "@/lib/constants";
import type { SectionId } from "@/lib/constants";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = await resolveUserId(session);

  if (!userId) {
    redirect("/login");
  }

  await connectDB();
  const user = await User.findById(userId).lean();

  if (user && !user.onboardingDone) {
    redirect("/onboarding");
  }

  const enabledSections = (user?.enabledSections as SectionId[] | undefined) ?? [...DEFAULT_ENABLED_SECTIONS];

  return (
    <SectionsProvider initialSections={enabledSections}>
      <div className="min-h-screen flex">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">{children}</div>
          <MobileNav />
        </main>
      </div>
    </SectionsProvider>
  );
}
