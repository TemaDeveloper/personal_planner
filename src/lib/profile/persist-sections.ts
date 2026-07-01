import type { GeneratedSection } from "@/lib/profile/generate-sections";
import type { IFieldDefinition } from "@/lib/models/section-template";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

export interface TemplateDoc {
  name: string;
  slug: string;
  icon: string;
  description: string;
  fields: IFieldDefinition[];
  viewType: string;
  layoutHtml: string;
  isBuiltIn: boolean;
  createdBy: string;
  usageCount: number;
}

/**
 * Pure transform from a generated section spec to a SectionTemplate document,
 * preserving typed computations. Slug uniqueness is the caller's job (DB).
 */
export function buildTemplateDoc(
  section: GeneratedSection,
  userId: string,
  slug: string
): TemplateDoc {
  return {
    name: section.name.trim(),
    slug,
    icon: section.icon || "Star",
    description: section.description || "",
    fields: section.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      ...(f.options ? { options: f.options } : {}),
      ...(f.formula ? { formula: f.formula } : {}),
      ...(f.computation ? { computation: f.computation } : {}),
    })),
    viewType: section.viewType,
    layoutHtml: section.layoutHtml,
    isBuiltIn: false,
    createdBy: userId,
    usageCount: 1,
  };
}
