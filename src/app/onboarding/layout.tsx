import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";

// Revisiting onboarding after completion would re-run the wizard and
// overwrite existing sections/config, so onboarded users are sent home.
export default async function OnboardingLayout({
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

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingDone) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
