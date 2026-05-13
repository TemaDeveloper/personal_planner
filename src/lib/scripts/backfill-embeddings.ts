/**
 * One-time script to backfill embeddings for existing SectionTemplate documents.
 *
 * Run with: npx tsx src/lib/scripts/backfill-embeddings.ts
 *
 * Requires OPENAI_API_KEY and MONGODB_URI environment variables.
 */

import mongoose from "mongoose";
import SectionTemplate from "@/lib/models/section-template";
import { generateEmbedding, templateToEmbeddingInput } from "@/lib/embeddings";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const templates = await SectionTemplate.find({
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
  });

  console.log(`Found ${templates.length} templates without embeddings`);

  for (const template of templates) {
    const input = templateToEmbeddingInput(
      template.name,
      template.description,
      template.fields
    );

    try {
      const embedding = await generateEmbedding(input);
      template.embedding = embedding;
      template.isShared = true;
      await template.save();
      console.log(`✓ ${template.name} (${template.slug})`);
    } catch (err) {
      console.error(`✗ ${template.name}: ${err}`);
    }

    // Rate limit: OpenAI embeddings API allows ~3000 RPM, but be nice
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("Done");
  await mongoose.disconnect();
}

main().catch(console.error);
