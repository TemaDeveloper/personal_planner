import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import ShareToken from "@/lib/models/share-token";
import User from "@/lib/models/user";
import { SECTIONS, SECTION_META, type SectionId } from "@/lib/constants";
import { SharedDataViewer } from "./shared-data-viewer";

function sectionLabel(sectionType: string): string {
  if (sectionType.startsWith("custom:")) {
    return sectionType.slice(7).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if ((SECTIONS as readonly string[]).includes(sectionType)) {
    return SECTION_META[sectionType as SectionId].label;
  }
  return sectionType;
}

export default async function SharedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await connectDB();

  const share = await ShareToken.findOne({ token }).lean();
  if (!share) notFound();

  const isRevoked = !!share.revokedAt;
  const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;

  if (isRevoked || isExpired) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-white mb-2">
            This link is no longer active
          </h1>
          <p className="text-sm text-white/60">
            {isRevoked
              ? "The owner has revoked access to this shared data."
              : "This share link has expired."}
          </p>
        </div>
      </div>
    );
  }

  const owner = await User.findById(share.ownerId).select("name").lean();
  const ownerName = (owner?.name as string) || "Someone";
  const label = sectionLabel(share.sectionType);
  const scope = share.scopeFilter ? ` — ${share.scopeFilter}` : "";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-white/10 bg-white/[0.03]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{label}{scope}</h1>
            <p className="text-sm text-white/50">
              Shared by {ownerName} — View only
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold bg-indigo-500 text-white">
            P
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <SharedDataViewer token={token} />
      </div>
    </div>
  );
}
