import mongoose, { Schema, type Document } from "mongoose";

export interface IStudySession extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  date: Date;
  minutes: number;
  note?: string;
}

const StudySessionSchema = new Schema<IStudySession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    date: { type: Date, required: true },
    minutes: { type: Number, required: true, min: 1 },
    note: { type: String },
  },
  { timestamps: true }
);

StudySessionSchema.index({ userId: 1, date: -1 });
StudySessionSchema.index({ userId: 1, subject: 1, date: -1 });

if (mongoose.models.StudySession) mongoose.deleteModel("StudySession");
export default mongoose.model<IStudySession>("StudySession", StudySessionSchema);
