import mongoose, { Schema, type Document } from "mongoose";

/**
 * A single fact about a user's life. The vocabulary is OPEN: `dimension` is a
 * free string, not an enum. Common dimensions (livelihood, mobility, health,
 * ...) are seeds only; the generator may mint dimensions no one anticipated.
 * `salience` (0..1) decides whether a facet becomes a section, a dashboard
 * KPI, or quiet context.
 */
export interface ILifeFacet {
  key: string;
  dimension: string;
  value: string;
  salience: number;
  source: "asked" | "inferred" | "stated";
}

export interface ILifeProfile extends Document {
  userId: mongoose.Types.ObjectId;
  facets: ILifeFacet[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const LifeFacetSchema = new Schema<ILifeFacet>(
  {
    key: { type: String, required: true },
    dimension: { type: String, required: true },
    value: { type: String, required: true },
    salience: { type: Number, default: 0.5, min: 0, max: 1 },
    source: {
      type: String,
      enum: ["asked", "inferred", "stated"],
      default: "inferred",
    },
  },
  { _id: false }
);

const LifeProfileSchema = new Schema<ILifeProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    facets: { type: [LifeFacetSchema], default: [] },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

LifeProfileSchema.index({ userId: 1 }, { unique: true });

if (mongoose.models.LifeProfile) mongoose.deleteModel("LifeProfile");
export default mongoose.model<ILifeProfile>("LifeProfile", LifeProfileSchema);
