import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import { ShardField } from "@/components/auth/shard-field";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only bounce to /dashboard when the session maps to a real user —
  // a stale session for a deleted account must still see the login page,
  // otherwise it ping-pongs between here and the app layout.
  const session = await auth();
  const userId = await resolveUserId(session);
  if (userId) {
    await connectDB();
    const exists = await User.exists({ _id: userId });
    if (exists) {
      redirect("/dashboard");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "var(--bg-page)" }}
    >
      <ShardField />
      <div className="w-full max-w-md relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
