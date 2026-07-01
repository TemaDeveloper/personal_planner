import mongoose, { Schema, type Document } from "mongoose";

/**
 * The growing facet-dimension vocabulary (learn-back). Common dimensions
 * accumulate count and become cheap priors for the onboarding interview and
 * generation; novel ones are still recorded so the next similar person is fast.
 */
export interface IFacetVocab extends Document {
  dimension: string;
  count: number;
  examples: string[];
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const FacetVocabSchema = new Schema<IFacetVocab>(
  {
    dimension: { type: String, required: true, unique: true, lowercase: true, trim: true },
    count: { type: Number, default: 1 },
    examples: { type: [String], default: [] },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

FacetVocabSchema.index({ dimension: 1 }, { unique: true });
FacetVocabSchema.index({ count: -1 });

if (mongoose.models.FacetVocab) mongoose.deleteModel("FacetVocab");
export default mongoose.model<IFacetVocab>("FacetVocab", FacetVocabSchema);
