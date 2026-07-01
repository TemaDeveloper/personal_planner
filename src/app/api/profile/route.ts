import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { getProfile, replaceFacets } from "@/lib/profile/profile-store";
import type { ILifeFacet } from "@/lib/models/life-profile";

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(userId);
  return NextResponse.json({ profile: profile ?? { facets: [], version: 0 } });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.facets)) {
    return NextResponse.json({ error: "facets array required" }, { status: 400 });
  }

  try {
    const profile = await replaceFacets(userId, body.facets as ILifeFacet[]);
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid facets" },
      { status: 400 }
    );
  }
}
