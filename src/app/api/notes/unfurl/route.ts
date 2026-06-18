import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { isPublicHttpUrl } from "@/lib/notes/safe-url";
import { extractMeta } from "@/lib/notes/unfurl";

const TIMEOUT_MS = 6000;
const MAX_BYTES = 512 * 1024; // only need the <head>
const MAX_REDIRECTS = 3;

/** Fetch a public URL and return link-preview metadata for the bookmark block.
 * SSRF-guarded: every URL (including each redirect hop) must pass isPublicHttpUrl. */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const check = isPublicHttpUrl(raw);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let current = check.url;
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "LiforaBot/1.0 (+notes link preview)", Accept: "text/html" },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        const next = isPublicHttpUrl(new URL(loc, current).toString());
        if (!next.ok) return NextResponse.json({ error: "Redirect to a blocked host" }, { status: 400 });
        current = next.url;
        continue;
      }
      break;
    }
    if (!res || !res.ok) return NextResponse.json({ error: "Could not fetch URL" }, { status: 502 });

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) {
      return NextResponse.json({ url: current, title: "", description: "", image: "", favicon: faviconFor(current) });
    }

    const buf = await res.arrayBuffer();
    const html = new TextDecoder().decode(buf.slice(0, MAX_BYTES));
    const meta = extractMeta(html);
    return NextResponse.json({ url: current, ...meta, favicon: faviconFor(current) });
  } catch {
    return NextResponse.json({ error: "Could not fetch URL" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

function faviconFor(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}/favicon.ico`;
  } catch {
    return "";
  }
}
