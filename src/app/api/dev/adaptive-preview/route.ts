import { NextResponse } from "next/server";
import { extractFacets } from "@/lib/profile/facet-extract";
import { generateSectionsFromFacets } from "@/lib/profile/generate-sections";
import type { AIProvider } from "@/lib/ai-providers";

/**
 * M0 walking-skeleton harness (dev only): run a free-text life description
 * through the full loop — description -> facets -> generated sections — and
 * return both, so the adaptive pipeline can be inspected without any UI.
 *
 * POST { description: string, provider: AIProvider, apiKey: string }
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let body: { description?: string; provider?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { description, provider, apiKey } = body;
  if (!description || !provider || !apiKey) {
    return NextResponse.json(
      { error: "description, provider and apiKey are required" },
      { status: 400 }
    );
  }

  try {
    const facets = await extractFacets(description, provider as AIProvider, apiKey);
    const sections = await generateSectionsFromFacets(facets, provider as AIProvider, apiKey);
    return NextResponse.json({ facets, sections });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "generation failed" },
      { status: 500 }
    );
  }
}
