import { connectDB } from "@/lib/db";
import LifeProfile, { type ILifeFacet } from "@/lib/models/life-profile";
import { mergeFacets } from "@/lib/profile/merge";

export async function getProfile(userId: string) {
  await connectDB();
  return LifeProfile.findOne({ userId }).lean();
}

/** Merge incoming facets into the living profile, bumping the version. */
export async function applyFacets(userId: string, incoming: ILifeFacet[]) {
  await connectDB();
  const doc = await LifeProfile.findOne({ userId });
  if (!doc) {
    return LifeProfile.create({ userId, facets: incoming, version: 1 });
  }
  doc.facets = mergeFacets(doc.facets, incoming);
  doc.version += 1;
  await doc.save();
  return doc;
}

/** Replace the whole facet set (explicit profile edit), bumping the version. */
export async function replaceFacets(userId: string, facets: ILifeFacet[]) {
  await connectDB();
  const doc = await LifeProfile.findOne({ userId });
  if (!doc) {
    return LifeProfile.create({ userId, facets, version: 1 });
  }
  doc.facets = facets;
  doc.version += 1;
  await doc.save();
  return doc;
}
