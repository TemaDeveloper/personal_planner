import mongoose, { Schema, type Document } from "mongoose";

export interface IGymAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  createdAt: Date;
}

const GymAttendanceSchema = new Schema<IGymAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true, collection: "gym_attendance" }
);

GymAttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

if (mongoose.models.GymAttendance) mongoose.deleteModel("GymAttendance");
export default mongoose.model<IGymAttendance>("GymAttendance", GymAttendanceSchema);
