import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.AUTH_SECRET = process.env.AUTH_SECRET ? "set" : "MISSING";
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "set" : "MISSING";
  checks.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? "set" : "MISSING";
  checks.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? "set" : "MISSING";
  checks.MONGODB_URI = process.env.MONGODB_URI ? "set" : "MISSING";

  // Test DB connection
  try {
    await connectDB();
    checks.db = "connected";
  } catch (e) {
    checks.db = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test auth import
  try {
    const { auth } = await import("@/lib/auth");
    checks.auth_import = "ok";
  } catch (e) {
    checks.auth_import = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(checks);
}
