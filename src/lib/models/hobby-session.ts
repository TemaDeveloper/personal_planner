import mongoose, { Schema, type Document } from "mongoose";

export interface IHobbySession extends Document {
  userId: mongoose.Types.ObjectId;
  hobby: string;
  date: Date;
  minutes: number;
  note?: string;
  createdAt: Date;
}

const HobbySessionSchema = new Schema<IHobbySession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hobby: { type: String, required: true },
    date: { type: Date, required: true },
    minutes: { type: Number, required: true, min: 1 },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

HobbySessionSchema.index({ userId: 1, hobby: 1, date: -1 });
HobbySessionSchema.index({ userId: 1, date: -1 });

if (mongoose.models.HobbySession) mongoose.deleteModel("HobbySession");
export default mongoose.model<IHobbySession>("HobbySession", HobbySessionSchema);
