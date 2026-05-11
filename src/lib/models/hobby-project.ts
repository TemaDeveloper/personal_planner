import mongoose, { Schema, type Document } from "mongoose";

export interface IHobbyProject extends Document {
  userId: mongoose.Types.ObjectId;
  hobby: string;
  name: string;
  description?: string;
  status: "in-progress" | "completed" | "paused";
  startDate: Date;
  createdAt: Date;
}

const HobbyProjectSchema = new Schema<IHobbyProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hobby: { type: String, required: true },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ["in-progress", "completed", "paused"],
      default: "in-progress",
    },
    startDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

HobbyProjectSchema.index({ userId: 1, hobby: 1 });
HobbyProjectSchema.index({ userId: 1, status: 1 });

if (mongoose.models.HobbyProject) mongoose.deleteModel("HobbyProject");
export default mongoose.model<IHobbyProject>("HobbyProject", HobbyProjectSchema);
