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
  // Convert Mongoose subdocuments to plain objects first — spreading a subdoc
  // ({...f}) drops its schema fields (e.g. `source`), which would corrupt the
  // provenance-precedence logic in mergeFacets.
  const existing: ILifeFacet[] = doc.facets.map((f) => ({
    key: f.key,
    dimension: f.dimension,
    value: f.value,
    salience: f.salience,
    source: f.source,
  }));
  doc.facets = mergeFacets(existing, incoming);
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
