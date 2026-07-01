import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import { migrateUserBuiltins } from "@/lib/profile/migrate-runner";

/**
 * Admin-guarded, additive, idempotent migration of legacy built-in data into
 * the unified CustomEntry model. Requires `x-admin-token` === ADMIN_TOKEN.
 *
 * POST { userId?: string, allUsers?: boolean, dryRun?: boolean }
 * Pass dryRun: true first to see counts without writing.
 */
export async function POST(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers.get("x-admin-token") !== token) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = Boolean(body?.dryRun);

  if (body?.userId) {
    const report = await migrateUserBuiltins(String(body.userId), { dryRun });
    return NextResponse.json({ users: 1, report });
  }

  if (body?.allUsers) {
    await connectDB();
    const users = await User.find({}).select("_id").lean();
    let totalInserts = 0;
    const perSection: Record<string, number> = {};
    for (const u of users) {
      const report = await migrateUserBuiltins(String(u._id), { dryRun });
      totalInserts += report.totalInserts;
      for (const [k, v] of Object.entries(report.counts)) {
        perSection[k] = (perSection[k] ?? 0) + v;
      }
    }
    return NextResponse.json({ dryRun, users: users.length, totalInserts, perSection });
  }

  return NextResponse.json({ error: "userId or allUsers required" }, { status: 400 });
}
