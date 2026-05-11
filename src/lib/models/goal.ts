import mongoose, { Schema, type Document } from "mongoose";

export interface IMilestone {
  title: string;
  completed: boolean;
}

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  targetDate?: Date;
  category: "personal" | "career" | "health" | "financial";
  status: "active" | "completed" | "paused";
  milestones: IMilestone[];
  createdAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    targetDate: { type: Date },
    category: {
      type: String,
      enum: ["personal", "career", "health", "financial"],
      default: "personal",
    },
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },
    milestones: {
      type: [
        {
          title: { type: String, required: true },
          completed: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

GoalSchema.index({ userId: 1, status: 1 });

if (mongoose.models.Goal) mongoose.deleteModel("Goal");
export default mongoose.model<IGoal>("Goal", GoalSchema);
