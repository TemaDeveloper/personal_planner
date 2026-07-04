import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import PasswordResetToken from "@/lib/models/password-reset-token";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000; // skip sending if a token was just issued

const forgotPasswordSchema = z.object({
  email: z.string().email().max(200),
});

// Always 200 {ok:true} regardless of outcome — no account enumeration.
const ok = () => NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) return ok();

    await connectDB();

    const user = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    });
    // Only credentials accounts (with a password) can reset. Google-only
    // accounts sign in via OAuth — the reset page copy covers that case.
    if (!user || !user.password) return ok();

    // Light rate limit: an unused token created in the last 60s means we
    // already sent a link very recently — skip.
    const recent = await PasswordResetToken.findOne({
      userId: user._id,
      usedAt: null,
      createdAt: { $gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    });
    if (recent) return ok();

    // Invalidate any previous unused tokens so only the newest link works.
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      usedAt: null,
    });

    // Build the reset link from the request's own origin so it's correct on
    // any domain, honouring proxy headers, then fall back to env.
    const fwdHost =
      req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
    const origin = fwdHost
      ? `${fwdProto}://${fwdHost}`
      : process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return ok();
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still 200 — never leak whether the email exists or what failed.
    return ok();
  }
}
