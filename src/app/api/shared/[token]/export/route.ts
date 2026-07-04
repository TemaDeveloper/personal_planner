import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ShareToken from "@/lib/models/share-token";
import { generateExcel } from "@/lib/excel";
import { buildExport } from "@/lib/export-builders";

/** Masks an email for the restricted-share message: "a•••@company.com". */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}•••@${domain}`;
}

// Token-gated Excel download. Mirrors the access rules of the share view:
// anyone holding a valid, non-revoked, non-expired token can export the same
// data they can already see — no login required, unless the share is
// restricted to a specific invitee email.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  await connectDB();
  const { token } = await params;

  const share = await ShareToken.findOne({ token }).lean();
  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });
  if (share.revokedAt)
    return NextResponse.json({ error: "This share has been revoked" }, { status: 410 });
  if (share.expiresAt && new Date(share.expiresAt) < new Date())
    return NextResponse.json({ error: "This share has expired" }, { status: 410 });

  // "Specific email" shares require a signed-in account matching the invitee.
  if (share.inviteeEmail) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email || email !== share.inviteeEmail.toLowerCase()) {
      return NextResponse.json(
        {
          error: `This share is restricted to a specific account — sign in as ${maskEmail(share.inviteeEmail)} to view it`,
        },
        { status: 403 }
      );
    }
  }

  const { name, columns, rows, options } = await buildExport(
    share.sectionType,
    String(share.ownerId),
    share.scopeFilter ?? undefined
  );
  if (columns.length === 0) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  const buffer = await generateExcel(name, columns, rows, options);
  const filename = `${name.toLowerCase().replace(/\s+/g, "-")}-export.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
