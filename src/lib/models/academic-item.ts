import mongoose, { Schema, type Document } from "mongoose";

export interface IAcademicItem extends Document {
  userId: mongoose.Types.ObjectId;
  type: "lab" | "assignment" | "test" | "quiz";
  subject: string;
  title: string;
  dueDate: Date;
  completed: boolean;
  grade?: number;
  note?: string;
}

const AcademicItemSchema = new Schema<IAcademicItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["lab", "assignment", "test", "quiz"],
      required: true,
    },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    grade: { type: Number },
    note: { type: String },
  },
  { timestamps: true }
);

AcademicItemSchema.index({ userId: 1, type: 1, dueDate: -1 });
AcademicItemSchema.index({ userId: 1, subject: 1, dueDate: -1 });

if (mongoose.models.AcademicItem) mongoose.deleteModel("AcademicItem");
export default mongoose.model<IAcademicItem>("AcademicItem", AcademicItemSchema);
