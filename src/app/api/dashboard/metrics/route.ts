// src/app/api/dashboard/metrics/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import DashboardMetric from "@/lib/models/dashboard-metric";
import { resolveMetricValue } from "@/lib/metric-resolver";

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const [user, metrics] = await Promise.all([
    User.findById(userId).lean(),
    DashboardMetric.find({ userId }).sort({ order: 1 }).lean(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const resolved = await Promise.all(
    metrics.map((m) => resolveMetricValue(m, String(userId), user))
  );

  return NextResponse.json({ metrics: resolved });
}
