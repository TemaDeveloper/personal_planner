import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import PasswordResetToken from "@/lib/models/password-reset-token";

// Same password rules as registration (see registerSchema in validations.ts —
// defined inline here to keep this route self-contained).
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset token").max(200),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { token, password } = parsed.data;

    await connectDB();

    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Atomically claim the token so it can only ever be used once.
    const resetToken = await PasswordResetToken.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { usedAt: new Date() }
    );
    if (!resetToken) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(password, 12);
    if (!user.provider) user.provider = "credentials";
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
