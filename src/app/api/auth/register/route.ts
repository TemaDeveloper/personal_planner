import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import { registerSchema } from "@/lib/validations";
import { ensureUserCalendar } from "@/lib/calendar-section";
import { DEFAULT_ENABLED_SECTIONS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { name, email, password } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      provider: "credentials",
    });

    // Provision the default calendar section for the new user. Never fail
    // registration if this step errors — it is backfilled on first app load.
    try {
      await ensureUserCalendar(user._id, [...DEFAULT_ENABLED_SECTIONS]);
    } catch (err) {
      console.error("Calendar provisioning failed for new user:", err);
    }

    return NextResponse.json(
      { id: user._id.toString(), email: user.email },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
