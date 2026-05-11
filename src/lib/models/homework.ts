import mongoose, { Schema, type Document } from "mongoose";

export interface IHomework extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  title: string;
  dueDate?: Date;
  completed: boolean;
}

const HomeworkSchema = new Schema<IHomework>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

HomeworkSchema.index({ userId: 1, completed: 1, dueDate: 1 });

if (mongoose.models.Homework) mongoose.deleteModel("Homework");
export default mongoose.model<IHomework>("Homework", HomeworkSchema);
