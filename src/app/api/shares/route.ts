import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import ShareToken, { shareTokenCreateSchema } from "@/lib/models/share-token";
import User from "@/lib/models/user";
import { sendShareInvite } from "@/lib/email";
import { SECTIONS, SECTION_META, type SectionId } from "@/lib/constants";

function sectionLabel(sectionType: string): string {
  if (sectionType.startsWith("custom:")) return sectionType.slice(7);
  if ((SECTIONS as readonly string[]).includes(sectionType)) {
    return SECTION_META[sectionType as SectionId].label;
  }
  return sectionType;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const parsed = shareTokenCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { sectionType, scopeFilter, inviteeEmail, label, expiresAt } = parsed.data;

  const token = randomUUID();

  await ShareToken.create({
    token,
    ownerId: userId,
    sectionType,
    scopeFilter: scopeFilter ?? null,
    inviteeEmail: inviteeEmail ? inviteeEmail.toLowerCase().trim() : null,
    permission: "view",
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    revokedAt: null,
    label: label ?? "",
  });

  // Build the share link from the request's own origin so it's correct on any
  // domain (e.g. lifora.space), honouring proxy headers, then fall back to env.
  const fwdHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = fwdHost ? `${fwdProto}://${fwdHost}` : (process.env.NEXTAUTH_URL || "http://localhost:3000");
  const url = `${origin}/shared/${token}`;

  if (inviteeEmail) {
    const owner = await User.findById(userId).lean();
    const ownerName = owner?.name ?? "Someone";
    await sendShareInvite(ownerName, inviteeEmail, sectionLabel(sectionType), url);
  }

  return NextResponse.json({ token, url }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const shares = await ShareToken.find({ ownerId: userId }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ shares });
}
