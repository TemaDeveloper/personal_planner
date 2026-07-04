"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { LiforaLogo } from "@/components/brand/lifora-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // The confirmation copy is intentionally the same either way —
      // never reveal whether the account exists.
    }

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <LiforaLogo size={44} className="mx-auto mb-5 block" />
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Forgot your password?
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <Card variant="default" padding="lg" className="space-y-6">
        {submitted ? (
          <p className="text-sm text-center" style={{ color: "var(--text-primary)" }}>
            If an account exists for that email, we&apos;ve sent a reset link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Signed up with Google? Just use &ldquo;Continue with Google&rdquo; on
          the sign-in page.
        </p>

        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium hover:underline"
            style={{ color: "var(--accent-text)" }}
          >
            Back to sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
