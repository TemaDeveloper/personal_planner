import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import ShareToken from "@/lib/models/share-token";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { token } = await params;

  const share = await ShareToken.findOne({ token, ownerId: userId });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.revoke === true) share.revokedAt = new Date();
  if (body.label !== undefined) share.label = String(body.label).slice(0, 200);
  if (body.expiresAt !== undefined) share.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  await share.save();
  return NextResponse.json({ share });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { token } = await params;

  const result = await ShareToken.deleteOne({ token, ownerId: userId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
