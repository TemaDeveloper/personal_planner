import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Image upload is not configured (missing BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });

  const blob = await put(`notes/${userId}/${Date.now()}-${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });
  // Private blobs aren't publicly fetchable; serve them through our authenticated
  // /api/notes/blob route, which verifies ownership and streams the bytes.
  return NextResponse.json({ url: `/api/notes/blob?pathname=${encodeURIComponent(blob.pathname)}` });
}
