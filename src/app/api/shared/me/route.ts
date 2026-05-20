import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import ShareToken from "@/lib/models/share-token";
import User from "@/lib/models/user";

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(userId).select("email").lean();
  if (!user?.email) {
    return NextResponse.json({ shares: [] });
  }

  const now = new Date();
  const shares = await ShareToken.find({
    inviteeEmail: user.email,
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  // Fetch owner names
  const ownerIds = [...new Set(shares.map((s) => String(s.ownerId)))];
  const owners = await User.find({ _id: { $in: ownerIds } })
    .select("name")
    .lean();
  const ownerMap = new Map(owners.map((o) => [String(o._id), o.name as string]));

  const enriched = shares.map((s) => ({
    token: s.token,
    sectionType: s.sectionType,
    scopeFilter: s.scopeFilter,
    ownerName: ownerMap.get(String(s.ownerId)) || "Unknown",
    label: s.label,
    createdAt: s.createdAt,
  }));

  return NextResponse.json({ shares: enriched });
}
