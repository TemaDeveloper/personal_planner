"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { SECTIONS, SECTION_META, type SectionId } from "@/lib/constants";

interface SharedItem {
  token: string;
  sectionType: string;
  scopeFilter: string | null;
  ownerName: string;
  label: string;
  createdAt: string;
}

function sectionLabel(sectionType: string): string {
  if (sectionType.startsWith("custom:")) {
    return sectionType.slice(7).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if ((SECTIONS as readonly string[]).includes(sectionType)) {
    return SECTION_META[sectionType as SectionId].label;
  }
  return sectionType;
}

export default function SharedWithMePage() {
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shared/me")
      .then((r) => r.json())
      .then((d) => setItems(d.shares || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <PageHeader
        title="Shared with me"
        description="Sections other people have shared with you"
      />

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] animate-pulse">Loading...</p>
      ) : items.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Users size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            Nothing shared with you yet.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Link key={item.token} href={`/shared/${item.token}`}>
              <Card padding="md" className="hover:bg-[var(--surface-1)] transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {sectionLabel(item.sectionType)}
                      {item.scopeFilter && (
                        <span className="text-[var(--text-muted)]"> — {item.scopeFilter}</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Shared by {item.ownerName}
                      {item.label && ` · ${item.label}`}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">View only</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
