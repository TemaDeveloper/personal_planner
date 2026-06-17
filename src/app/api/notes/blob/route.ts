import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";

/** Streams a private Notes blob back to the owner.
 * The pathname is namespaced `notes/<userId>/...` at upload time, so we only
 * serve blobs whose path belongs to the requesting user. */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage is not configured." }, { status: 503 });
  }

  const pathname = req.nextUrl.searchParams.get("pathname");
  if (!pathname) return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
  if (!pathname.startsWith(`notes/${userId}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await get(pathname, { access: "private" });
  if (!result || !result.stream) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
