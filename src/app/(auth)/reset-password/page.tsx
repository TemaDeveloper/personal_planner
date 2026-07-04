"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { LiforaLogo } from "@/components/brand/lifora-logo";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <LiforaLogo size={44} className="mx-auto mb-5 block" />
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Reset your password
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Choose a new password for your account
        </p>
      </div>

      <Card variant="default" padding="lg" className="space-y-6">
        {success ? (
          <div className="text-center space-y-4">
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              Your password has been reset.
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              <Link
                href="/login"
                className="font-medium hover:underline"
                style={{ color: "var(--accent-text)" }}
              >
                Sign in with your new password
              </Link>
            </p>
          </div>
        ) : !token ? (
          <div className="text-center space-y-4">
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              This reset link is missing its token.
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              <Link
                href="/forgot-password"
                className="font-medium hover:underline"
                style={{ color: "var(--accent-text)" }}
              >
                Request a new reset link
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="New password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              maxLength={128}
              required
            />

            <FormInput
              label="Confirm new password"
              type="password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              error={error || undefined}
            />

            {error && (
              <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
                <Link
                  href="/forgot-password"
                  className="font-medium hover:underline"
                  style={{ color: "var(--accent-text)" }}
                >
                  Request a new reset link
                </Link>
              </p>
            )}

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
                "Reset password"
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
