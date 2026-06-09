import mongoose, { Schema, type Document } from "mongoose";

export interface ICustomEntry extends Document {
  userId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  date: Date;
  data: Record<string, unknown>;
  order: number;
  // Calendar fields (only set by calendar-viewType sections):
  title?: string;
  start?: Date;
  end?: Date;
  allDay?: boolean;
  categoryKey?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomEntrySchema = new Schema<ICustomEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "SectionTemplate", required: true },
    date: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
    title: { type: String },
    start: { type: Date },
    end: { type: Date },
    allDay: { type: Boolean },
    categoryKey: { type: String },
    description: { type: String },
  },
  { timestamps: true }
);

CustomEntrySchema.index({ userId: 1, templateId: 1, date: -1 });
CustomEntrySchema.index({ userId: 1, templateId: 1, start: 1 });

if (mongoose.models.CustomEntry) mongoose.deleteModel("CustomEntry");
export default mongoose.model<ICustomEntry>("CustomEntry", CustomEntrySchema);
