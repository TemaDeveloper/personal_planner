import { NextRequest, NextResponse } from "next/server";
import { seedBuiltInTemplates } from "@/lib/profile/seed-run";

/**
 * Admin-guarded seeding of the 13 built-ins as unified SectionTemplates.
 * Idempotent + additive. Requires `x-admin-token` to match ADMIN_TOKEN so it
 * can be run once in production without exposing it publicly.
 */
export async function POST(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers.get("x-admin-token") !== token) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const result = await seedBuiltInTemplates();
  return NextResponse.json(result);
}
