import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import HobbyProject from "@/lib/models/hobby-project";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const hobby = searchParams.get("hobby");
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = { userId };
  if (hobby) filter.hobby = hobby;
  if (status) filter.status = status;

  const projects = await HobbyProject.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { hobby, name, description } = body;

  if (!hobby || !name) {
    return NextResponse.json(
      { error: "hobby and name are required" },
      { status: 400 }
    );
  }

  const project = await HobbyProject.create({
    userId,
    hobby,
    name,
    description,
  });

  return NextResponse.json({ project }, { status: 201 });
}
