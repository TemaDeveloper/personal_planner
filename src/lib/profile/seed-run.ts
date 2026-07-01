import { connectDB } from "@/lib/db";
import SectionTemplate from "@/lib/models/section-template";
import { buildSeedTemplates } from "@/lib/profile/seed-templates";

/**
 * Idempotently upsert the 13 built-ins as seed SectionTemplates (isBuiltIn,
 * createdBy: null). Safe to run repeatedly — matches on slug and updates the
 * spec in place. Additive: existing user data/templates are untouched.
 */
export async function seedBuiltInTemplates(): Promise<{ upserted: number }> {
  await connectDB();
  const seeds = buildSeedTemplates();
  let upserted = 0;
  for (const seed of seeds) {
    await SectionTemplate.findOneAndUpdate(
      { slug: seed.slug },
      {
        $set: {
          name: seed.name,
          icon: seed.icon,
          description: seed.description,
          fields: seed.fields,
          viewType: seed.viewType,
          isBuiltIn: true,
          createdBy: null,
        },
        $setOnInsert: { usageCount: seed.usageCount, isShared: true },
      },
      { upsert: true }
    );
    upserted++;
  }
  return { upserted };
}
