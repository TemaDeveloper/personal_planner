import mongoose, { Schema, type Document } from "mongoose";

export interface ISectionCustomization extends Document {
  userId: mongoose.Types.ObjectId;
  sectionKey: string;
  extraFields: {
    key: string; label: string;
    type: "boolean" | "number" | "text" | "select" | "date";
    options?: string[]; required?: boolean; formula?: string;
  }[];
  sourcePrompt?: string;
}

const FieldSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["boolean", "number", "text", "select", "date"], required: true },
    options: { type: [String], default: undefined },
    required: { type: Boolean, default: false },
    formula: { type: String },
  },
  { _id: false }
);

const SectionCustomizationSchema = new Schema<ISectionCustomization>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sectionKey: { type: String, required: true },
    extraFields: { type: [FieldSchema], default: [] },
    sourcePrompt: { type: String },
  },
  { timestamps: true, collection: "section_customizations" }
);
SectionCustomizationSchema.index({ userId: 1, sectionKey: 1 }, { unique: true });

if (mongoose.models.SectionCustomization) mongoose.deleteModel("SectionCustomization");
export default mongoose.model<ISectionCustomization>("SectionCustomization", SectionCustomizationSchema);
