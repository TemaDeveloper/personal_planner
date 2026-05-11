import mongoose, { Schema, type Document } from "mongoose";

export interface IAdvapayTask extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  title: string;
  completed: boolean;
  createdAt: Date;
}

const AdvapayTaskSchema = new Schema<IAdvapayTask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    title: { type: String, required: true, maxlength: 200 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AdvapayTaskSchema.index({ userId: 1, date: -1 });

if (mongoose.models.AdvapayTask) mongoose.deleteModel("AdvapayTask");
export default mongoose.model<IAdvapayTask>("AdvapayTask", AdvapayTaskSchema);
