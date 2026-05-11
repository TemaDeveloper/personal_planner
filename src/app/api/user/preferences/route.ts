import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(userId).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    preferences: user.preferences,
    workConfig: user.workConfig,
    studyConfig: user.studyConfig,
    hobbiesConfig: user.hobbiesConfig,
    houseworkConfig: user.houseworkConfig,
    bills: user.bills,
    name: user.name,
    avatarEmoji: user.avatarEmoji,
    enabledSections: user.enabledSections,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const updateFields: Record<string, unknown> = {};

  // Update preferences
  if (body.preferences) {
    for (const [key, value] of Object.entries(body.preferences)) {
      updateFields[`preferences.${key}`] = value;
    }
  }

  // Update work config
  if (body.workConfig) {
    if (body.workConfig.jobs !== undefined) {
      updateFields["workConfig.jobs"] = body.workConfig.jobs;
    }
    if (body.workConfig.gasPrice !== undefined) {
      updateFields["workConfig.gasPrice"] = body.workConfig.gasPrice;
    }
    if (body.workConfig.carConsumption !== undefined) {
      updateFields["workConfig.carConsumption"] = body.workConfig.carConsumption;
    }
  }

  // Update bills
  if (body.bills !== undefined) {
    updateFields.bills = body.bills;
  }

  // Update enabled sections
  if (body.enabledSections !== undefined) {
    updateFields.enabledSections = body.enabledSections;
  }

  // Update study config
  if (body.studyConfig) {
    if (body.studyConfig.subjects !== undefined) {
      updateFields["studyConfig.subjects"] = body.studyConfig.subjects;
    }
  }

  // Update hobbies config
  if (body.hobbiesConfig) {
    if (body.hobbiesConfig.hobbies !== undefined) {
      updateFields["hobbiesConfig.hobbies"] = body.hobbiesConfig.hobbies;
    }
  }

  // Update housework config
  if (body.houseworkConfig) {
    if (body.houseworkConfig.chores !== undefined) {
      updateFields["houseworkConfig.chores"] = body.houseworkConfig.chores;
    }
  }

  // Update profile fields
  if (body.name) updateFields.name = body.name;
  if (body.avatarEmoji) updateFields.avatarEmoji = body.avatarEmoji;
  if (body.onboardingDone !== undefined) updateFields.onboardingDone = body.onboardingDone;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true }
  ).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    preferences: user.preferences,
    workConfig: user.workConfig,
    studyConfig: user.studyConfig,
    hobbiesConfig: user.hobbiesConfig,
    houseworkConfig: user.houseworkConfig,
    bills: user.bills,
    enabledSections: user.enabledSections,
  });
}
