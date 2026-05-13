import mongoose, { Schema, type Document } from "mongoose";

export interface IFieldDefinition {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  required?: boolean;
  formula?: string;
}

export interface ISectionTemplate extends Document {
  name: string;
  slug: string;
  icon: string;
  description: string;
  fields: IFieldDefinition[];
  viewType: "weekly-cards" | "table" | "grid";
  isBuiltIn: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const FieldDefinitionSchema = new Schema<IFieldDefinition>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ["boolean", "number", "text", "select", "date"],
      required: true,
    },
    options: { type: [String], default: undefined },
    required: { type: Boolean, default: false },
    formula: { type: String },
  },
  { _id: false }
);

const SectionTemplateSchema = new Schema<ISectionTemplate>(
  {
    name: { type: String, required: true, maxlength: 50 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    icon: { type: String, required: true, default: "Star" },
    description: { type: String, maxlength: 200, default: "" },
    fields: { type: [FieldDefinitionSchema], default: [] },
    viewType: {
      type: String,
      enum: ["weekly-cards", "table", "grid"],
      default: "weekly-cards",
    },
    isBuiltIn: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    usageCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

SectionTemplateSchema.index({ slug: 1 }, { unique: true });
SectionTemplateSchema.index({ createdBy: 1 });
SectionTemplateSchema.index({ usageCount: -1 });

if (mongoose.models.SectionTemplate) mongoose.deleteModel("SectionTemplate");
export default mongoose.model<ISectionTemplate>("SectionTemplate", SectionTemplateSchema);
