import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { generateExcel } from "@/lib/excel";
import { buildExport } from "@/lib/export-builders";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { section } = await params;
  const { searchParams } = new URL(req.url);
  const job = searchParams.get("job") || undefined;

  const { name, columns, rows, options } = await buildExport(section, String(userId), job);
  if (columns.length === 0) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  const buffer = await generateExcel(name, columns, rows, options);
  const filename = `${name.toLowerCase().replace(/\s+/g, "-")}-export.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
