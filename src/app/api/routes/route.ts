import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import Route from "@/lib/models/route";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter: Record<string, unknown> = { userId };
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const routes = await Route.find(filter).sort({ date: -1 }).limit(200).lean();

  return NextResponse.json({ routes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { date, origin, destination, distanceKm, note } = body;

  if (!date || !origin || !destination || distanceKm === undefined) {
    return NextResponse.json(
      { error: "date, origin, destination, and distanceKm are required" },
      { status: 400 }
    );
  }

  const route = await Route.create({
    userId,
    date: new Date(date),
    origin,
    destination,
    distanceKm: Number(distanceKm),
    note,
  });

  return NextResponse.json({ route }, { status: 201 });
}
