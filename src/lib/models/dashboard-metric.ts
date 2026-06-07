import mongoose, { Schema, type Document } from "mongoose";

export interface IDashboardMetric extends Document {
  userId: mongoose.Types.ObjectId;
  label: string;
  sourceKind: "builtin" | "custom-field";
  sectionKey: string;
  fieldKey: string;
  aggregation: "sum" | "avg" | "latest" | "count";
  period: "week" | "month";
  order: number;
}

const DashboardMetricSchema = new Schema<IDashboardMetric>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, required: true },
    sourceKind: { type: String, enum: ["builtin", "custom-field"], required: true },
    sectionKey: { type: String, required: true },
    fieldKey: { type: String, required: true },
    aggregation: { type: String, enum: ["sum", "avg", "latest", "count"], required: true },
    period: { type: String, enum: ["week", "month"], default: "week" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "dashboard_metrics" }
);
DashboardMetricSchema.index({ userId: 1, order: 1 });

if (mongoose.models.DashboardMetric) mongoose.deleteModel("DashboardMetric");
export default mongoose.model<IDashboardMetric>("DashboardMetric", DashboardMetricSchema);
