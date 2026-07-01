import { NextResponse } from "next/server";
import { seedBuiltInTemplates } from "@/lib/profile/seed-run";

/** Dev-only: seed the 13 built-ins as unified SectionTemplates (idempotent). */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const result = await seedBuiltInTemplates();
  return NextResponse.json(result);
}
