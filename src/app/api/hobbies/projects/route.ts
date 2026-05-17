import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import HobbyProject from "@/lib/models/hobby-project";
import { createHobbyProjectSchema } from "@/lib/validations";

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
  if (hobby) filter.hobby = String(hobby);
  if (status) filter.status = String(status);

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
  const parsed = createHobbyProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { hobby, name, description } = parsed.data;

  const project = await HobbyProject.create({
    userId,
    hobby,
    name,
    description,
  });

  return NextResponse.json({ project }, { status: 201 });
}
