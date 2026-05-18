"use client";

import { useMemo } from "react";
import { renderLayout } from "@/lib/layout-renderer";

interface FieldDef {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
}

interface RenderedLayoutProps {
  layoutHtml: string;
  data: Record<string, unknown>;
  fields: FieldDef[];
  entries?: Record<string, unknown>[];
  className?: string;
}

export function RenderedLayout({
  layoutHtml,
  data,
  fields,
  entries,
  className,
}: RenderedLayoutProps) {
  const html = useMemo(
    () => renderLayout(layoutHtml, data, fields, entries),
    [layoutHtml, data, fields, entries]
  );

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
