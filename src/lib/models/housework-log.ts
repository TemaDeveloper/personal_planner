import mongoose, { Schema, type Document } from "mongoose";

export interface IHouseworkLog extends Document {
  userId: mongoose.Types.ObjectId;
  choreName: string;
  date: Date;
  isRecurring: boolean;
  completed: boolean;
  createdAt: Date;
}

const HouseworkLogSchema = new Schema<IHouseworkLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    choreName: { type: String, required: true },
    date: { type: Date, required: true },
    isRecurring: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

HouseworkLogSchema.index({ userId: 1, date: 1 });
HouseworkLogSchema.index({ userId: 1, choreName: 1, date: 1 });

if (mongoose.models.HouseworkLog) mongoose.deleteModel("HouseworkLog");
export default mongoose.model<IHouseworkLog>("HouseworkLog", HouseworkLogSchema);
