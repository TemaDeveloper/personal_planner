import mongoose, { Schema, type Document } from "mongoose";

export interface IRoute extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  origin: string;
  destination: string;
  distanceKm: number;
  note?: string;
  createdAt: Date;
}

const RouteSchema = new Schema<IRoute>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    origin: { type: String, required: true, maxlength: 200 },
    destination: { type: String, required: true, maxlength: 200 },
    distanceKm: { type: Number, required: true, min: 0 },
    note: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

RouteSchema.index({ userId: 1, date: -1 });

if (mongoose.models.Route) mongoose.deleteModel("Route");
export default mongoose.model<IRoute>("Route", RouteSchema);
