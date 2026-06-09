import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import SectionTemplate from "@/lib/models/section-template";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SectionsProvider, type CustomSectionNav } from "@/components/providers/sections-provider";
import { ContentShell } from "@/components/layout/content-shell";
import { ensureUserCalendar } from "@/lib/calendar-section";
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

  // Every user gets a default calendar section (idempotent; also backfills
  // existing users on first load after this ships). Categories mirror the
  // user's enabled planner sections.
  const calendarTemplate = await ensureUserCalendar(userId, enabledSections);

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

  // On the first load after provisioning, `user` was read before the calendar was
  // linked, so inject it into the nav. Only inject when the user has no existing
  // link for it (so a later explicit disable is respected).
  if (
    calendarTemplate &&
    !userCustom.some((cs) => cs.templateId?.toString() === calendarTemplate._id.toString())
  ) {
    customSections.push({
      templateId: String(calendarTemplate._id),
      slug: calendarTemplate.slug,
      name: calendarTemplate.name,
      icon: calendarTemplate.icon,
      enabled: true,
    });
  }

  return (
    <SectionsProvider initialSections={enabledSections} initialCustomSections={customSections}>
      <div className="h-screen flex overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <ContentShell>{children}</ContentShell>
        </main>
      </div>
    </SectionsProvider>
  );
}
