import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import SectionTemplate from "@/lib/models/section-template";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SectionsProvider, type CustomSectionNav } from "@/components/providers/sections-provider";
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

  // Load custom section templates
  let customSections: CustomSectionNav[] = [];
  const userCustom = (user?.customSections || []) as { templateId: { toString(): string }; enabled: boolean }[];
  if (userCustom.length > 0) {
    const enabledCustom = userCustom.filter((cs) => cs.enabled);
    const templateIds = enabledCustom.map((cs) => cs.templateId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templates = await SectionTemplate.find({ _id: { $in: templateIds } } as any).lean();
    customSections = templates.map((t) => ({
      templateId: String(t._id),
      slug: t.slug,
      name: t.name,
      icon: t.icon,
      enabled: true,
    }));
  }

  return (
    <SectionsProvider initialSections={enabledSections} initialCustomSections={customSections}>
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
