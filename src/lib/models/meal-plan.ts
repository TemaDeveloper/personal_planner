import mongoose, { Schema, type Document } from "mongoose";

export interface IMeal {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  notes?: string;
}

export interface IMealPlan extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  dayOfWeek: number;
  meals: IMeal[];
  createdAt: Date;
}

const MealPlanSchema = new Schema<IMealPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    dayOfWeek: { type: Number, min: 1, max: 7, required: true },
    meals: {
      type: [
        {
          type: {
            type: String,
            enum: ["breakfast", "lunch", "dinner", "snack"],
            required: true,
          },
          name: { type: String, required: true },
          notes: { type: String, maxlength: 500 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

MealPlanSchema.index({ userId: 1, date: -1 });

if (mongoose.models.MealPlan) mongoose.deleteModel("MealPlan");
export default mongoose.model<IMealPlan>("MealPlan", MealPlanSchema);
