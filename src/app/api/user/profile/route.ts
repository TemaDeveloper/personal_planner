import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(userId)
    .select("-password")
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const allowed = ["name", "avatarEmoji"];
  const update: Record<string, unknown> = {};

  for (const key of allowed) {
    if (body[key] !== undefined) {
      update[key] = body[key];
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true }
  )
    .select("-password")
    .lean();

  return NextResponse.json({ user });
}
