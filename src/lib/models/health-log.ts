import mongoose, { Schema, type Document } from "mongoose";

export interface IHealthLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  water: number;
  sleepHours: number;
  weight?: number;
  mood: number;
  createdAt: Date;
}

const HealthLogSchema = new Schema<IHealthLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    water: { type: Number, default: 0, min: 0 },
    sleepHours: { type: Number, default: 0, min: 0, max: 24 },
    weight: { type: Number, min: 0 },
    mood: { type: Number, min: 1, max: 5, default: 3 },
  },
  { timestamps: true }
);

HealthLogSchema.index({ userId: 1, date: -1 }, { unique: true });

if (mongoose.models.HealthLog) mongoose.deleteModel("HealthLog");
export default mongoose.model<IHealthLog>("HealthLog", HealthLogSchema);
