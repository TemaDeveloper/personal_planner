import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import { DEFAULT_ENABLED_SECTIONS, type SectionId } from "@/lib/constants";

export async function requireSection(sectionId: SectionId) {
  const session = await auth();
  const userId = await resolveUserId(session);

  if (!userId) {
    redirect("/login");
  }

  await connectDB();
  const user = await User.findById(userId).select("enabledSections").lean();
  const enabled = (user?.enabledSections as SectionId[] | undefined) ?? [...DEFAULT_ENABLED_SECTIONS];

  if (!enabled.includes(sectionId)) {
    redirect("/dashboard");
  }
}
