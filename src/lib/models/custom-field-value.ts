import mongoose, { Schema, type Document } from "mongoose";

export interface ICustomFieldValue extends Document {
  userId: mongoose.Types.ObjectId;
  sectionKey: string;
  dateKey: string; // yyyy-MM-dd (UTC) — see src/lib/gym-date.ts
  fieldKey: string;
  value: unknown;
}

const CustomFieldValueSchema = new Schema<ICustomFieldValue>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sectionKey: { type: String, required: true },
    dateKey: { type: String, required: true },
    fieldKey: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "custom_field_values" }
);
CustomFieldValueSchema.index({ userId: 1, sectionKey: 1, dateKey: 1, fieldKey: 1 }, { unique: true });

if (mongoose.models.CustomFieldValue) mongoose.deleteModel("CustomFieldValue");
export default mongoose.model<ICustomFieldValue>("CustomFieldValue", CustomFieldValueSchema);
