"use client";

import { useEffect, useState } from "react";
import { useSections } from "@/components/providers/sections-provider";
import { BoardView } from "@/components/sections/board-view";

interface TemplateDoc {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  viewType?: string;
  fields: {
    key: string;
    label: string;
    type: "boolean" | "number" | "text" | "select" | "date";
    options?: string[];
    formula?: string;
  }[];
}

export function DashboardBoards() {
  const { customSections } = useSections();
  const [boardTemplates, setBoardTemplates] = useState<TemplateDoc[]>([]);

  useEffect(() => {
    // Only fetch if the user has custom sections
    if (customSections.length === 0) return;

    fetch("/api/sections/templates")
      .then((r) => r.json())
      .then(({ templates }: { templates: TemplateDoc[] }) => {
        // User's own section slugs
        const userSlugs = new Set(customSections.map((cs) => cs.slug));
        // Keep only board-type templates that belong to the user
        const boards = (templates ?? []).filter(
          (t) => t.viewType === "board" && userSlugs.has(t.slug)
        );
        setBoardTemplates(boards);
      })
      .catch(() => {
        // Silently fail — dashboard still usable without boards
      });
  }, [customSections]);

  if (boardTemplates.length === 0) return null;

  return (
    <section className="dashboard-boards-section">
      {boardTemplates.map((t) => (
        <div key={t.slug} className="dashboard-board-item">
          <h2 className="section-title">{t.name}</h2>
          <BoardView slug={t.slug} template={t} />
        </div>
      ))}
    </section>
  );
}
