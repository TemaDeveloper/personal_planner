import mongoose, { Schema, type Document } from "mongoose";

export interface IWorkSession extends Document {
  userId: mongoose.Types.ObjectId;
  jobName: string;
  date: Date;
  hours: number;
  note?: string;
  createdAt: Date;
}

const WorkSessionSchema = new Schema<IWorkSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobName: { type: String, required: true },
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0, max: 24 },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

WorkSessionSchema.index({ userId: 1, jobName: 1, date: -1 });
WorkSessionSchema.index({ userId: 1, date: -1 });

if (mongoose.models.WorkSession) mongoose.deleteModel("WorkSession");
export default mongoose.model<IWorkSession>("WorkSession", WorkSessionSchema);
