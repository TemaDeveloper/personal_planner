"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Link2,
  Mail,
  XCircle,
  Trash2,
  Copy,
  Eye,
  PenLine,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SectionId } from "@/lib/constants";

type AccessLevel = "viewer" | "editor";
type LinkType = "magic" | "email";

const ACCESS_SEGMENTS: { value: AccessLevel; label: string; icon: typeof Eye }[] = [
  { value: "viewer", label: "Viewer", icon: Eye },
  { value: "editor", label: "Editor", icon: PenLine },
];

const LINK_TYPE_SEGMENTS: { value: LinkType; label: string; icon: typeof Link2 }[] = [
  { value: "magic", label: "Magic link", icon: Link2 },
  { value: "email", label: "Specific email", icon: Mail },
];

export interface ShareEntry {
  token: string;
  sectionType: string;
  scopeFilter: string | null;
  inviteeEmail: string | null;
  label: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  enabledSections: SectionId[];
  customSections: { slug: string; name: string; enabled: boolean }[];
  jobs: { name: string }[];
  shares: ShareEntry[];
  onSharesChange: (shares: ShareEntry[]) => void;
}

export function ShareModal({
  open,
  onClose,
  enabledSections,
  customSections,
  jobs,
  shares,
  onSharesChange,
}: ShareModalProps) {
  const [sectionType, setSectionType] = useState<string>(enabledSections[0] ?? "work");
  const [scopeFilter, setScopeFilter] = useState("");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("viewer");
  const [linkType, setLinkType] = useState<LinkType>("magic");
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmRevokeToken, setConfirmRevokeToken] = useState<string | null>(null);

  const activeShares = shares.filter((s) => !s.revokedAt);

  const handleCreate = async () => {
    setCreating(true);
    const body: Record<string, string> = { sectionType };
    if (scopeFilter) body.scopeFilter = scopeFilter;
    if (linkType === "email" && inviteeEmail) body.inviteeEmail = inviteeEmail;
    if (label) body.label = label;
    if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setGeneratedUrl(data.url);
      navigator.clipboard.writeText(data.url);
      toast.success("Share link copied to clipboard!");

      const listRes = await fetch("/api/shares");
      const listData = await listRes.json();
      onSharesChange(listData.shares || []);
    } else {
      toast.error("Failed to create share");
    }
    setCreating(false);
  };

  const handleRevoke = async (token: string) => {
    const res = await fetch(`/api/shares/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoke: true }),
    });
    if (res.ok) {
      onSharesChange(
        shares.map((s) =>
          s.token === token ? { ...s, revokedAt: new Date().toISOString() } : s
        )
      );
      toast.success("Share revoked");
    }
  };

  const handleDelete = async (token: string) => {
    const res = await fetch(`/api/shares/${token}`, { method: "DELETE" });
    if (res.ok) {
      onSharesChange(shares.filter((s) => s.token !== token));
      toast.success("Share deleted");
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Sharing & access" maxWidth="max-w-lg">
        <div className="space-y-6 pt-1">
          {/* Create new share */}
          <div className="space-y-4">
            <span className="stat-label block">Create share link</span>

            {/* Section picker */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Section
              </label>
              <select
                value={sectionType}
                onChange={(e) => {
                  setSectionType(e.target.value);
                  setScopeFilter("");
                }}
                className="w-full rounded-md px-3 py-2 text-sm outline-none border"
                style={{
                  background: "var(--surface-1)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                {enabledSections.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
                {customSections.map((cs) => (
                  <option key={cs.slug} value={`custom:${cs.slug}`}>
                    {cs.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Job scope filter (work section only) */}
            {sectionType === "work" && jobs.length > 0 && (
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Job (optional — leave empty for all)
                </label>
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm outline-none border"
                  style={{
                    background: "var(--surface-1)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">All jobs</option>
                  {jobs.map((j) => (
                    <option key={j.name} value={j.name}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Access level */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Access level
              </label>
              <SegmentedControl
                segments={ACCESS_SEGMENTS}
                value={accessLevel}
                onChange={setAccessLevel}
                layoutId="share-access-level"
                className="w-full"
              />
              {accessLevel === "editor" && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
                  Editor access is reserved for a future update — shares today are view-only.
                </p>
              )}
            </div>

            {/* Link type */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Share via
              </label>
              <SegmentedControl
                segments={LINK_TYPE_SEGMENTS}
                value={linkType}
                onChange={setLinkType}
                layoutId="share-link-type"
                className="w-full"
              />
            </div>

            {linkType === "email" && (
              <FormInput
                label="Invitee email"
                type="email"
                placeholder="supervisor@company.com"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Label (optional)"
                type="text"
                placeholder="For my manager"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <FormInput
                label="Expires (optional)"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            {/* Generated link */}
            {generatedUrl && (
              <div
                className="p-3 rounded-md border"
                style={{
                  background: "var(--good-wash)",
                  borderColor: "var(--good)",
                }}
              >
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: "var(--good)" }}
                >
                  Share link — copied to clipboard
                </p>
                <div className="flex items-center gap-2">
                  <p
                    className="text-xs break-all flex-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {generatedUrl}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedUrl);
                      toast.success("Copied!");
                    }}
                    className="flex-shrink-0 cursor-pointer"
                    aria-label="Copy link"
                  >
                    <Copy size={13} style={{ color: "var(--good)" }} />
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleCreate}
              variant="primary"
              className="w-full"
              disabled={creating}
            >
              <Link2 size={15} />
              {creating ? "Creating…" : "Create & copy link"}
            </Button>
          </div>

          {/* Active shares list */}
          <div>
            <span className="stat-label block mb-3">Active shares</span>
            {activeShares.length === 0 ? (
              <EmptyState
                icon={Link2}
                title="No active shares"
                description="Create a share link above to give others access to a section."
              />
            ) : (
              <div className="space-y-2">
                {activeShares.map((s) => (
                  <Card key={s.token} variant="inset" padding="none">
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {s.sectionType}
                            {s.scopeFilter ? ` — ${s.scopeFilter}` : ""}
                          </p>
                          {/* Role pill — always Viewer for now */}
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
                            style={{
                              background: "var(--surface-1)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <Eye size={9} />
                            Viewer
                          </span>
                        </div>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {s.inviteeEmail || "Magic link"}
                          {s.label ? ` · ${s.label}` : ""}
                          {s.expiresAt
                            ? ` · expires ${new Date(s.expiresAt).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Copy link"
                          onClick={() => {
                            const url = `${window.location.origin}/shared/${s.token}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link copied");
                          }}
                        >
                          <Link2 size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Revoke share"
                          onClick={() => setConfirmRevokeToken(s.token)}
                        >
                          <XCircle size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete share"
                          onClick={() => handleDelete(s.token)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmRevokeToken}
        onClose={() => setConfirmRevokeToken(null)}
        onConfirm={() => {
          if (confirmRevokeToken) {
            handleRevoke(confirmRevokeToken);
            setConfirmRevokeToken(null);
          }
        }}
        title="Revoke share?"
        message="This will immediately revoke access for anyone using this share link. This action cannot be undone."
        confirmLabel="Revoke"
      />
    </>
  );
}
