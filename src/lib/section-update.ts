import { SECTIONS, type SectionId } from "@/lib/constants";

export type FieldType = "boolean" | "number" | "text" | "select" | "date";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  formula?: string;
}

export type SectionKind =
  | { kind: "dashboard" }
  | { kind: "builtin"; sectionKey: SectionId }
  | { kind: "custom"; slug: string };

export function resolveSectionKind(sectionKey: string): SectionKind {
  if (sectionKey === "dashboard") return { kind: "dashboard" };
  if (sectionKey.startsWith("custom:")) {
    return { kind: "custom", slug: sectionKey.slice("custom:".length) };
  }
  if ((SECTIONS as readonly string[]).includes(sectionKey)) {
    return { kind: "builtin", sectionKey: sectionKey as SectionId };
  }
  throw new Error(`Unknown section: ${sectionKey}`);
}

/** The AI returns the full desired list of extra fields; validate before persisting. */
export function validateExtraFields(fields: FieldDef[]): FieldDef[] {
  const seen = new Set<string>();
  for (const f of fields) {
    if (!f.key || !/^[a-z0-9_]+$/i.test(f.key)) {
      throw new Error(`Invalid field key: "${f.key}"`);
    }
    if (seen.has(f.key)) throw new Error(`Duplicate field key: "${f.key}"`);
    seen.add(f.key);
  }
  return fields;
}
