import mongoose, { Schema, type Document } from "mongoose";

export interface IHabit extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  emoji: string;
  color: string;
  active: boolean;
  createdAt: Date;
}

export interface IHabitLog extends Document {
  habitId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
}

const HabitSchema = new Schema<IHabit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, maxlength: 100 },
    emoji: { type: String, default: "🎯" },
    color: { type: String, default: "#D4A853" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const HabitLogSchema = new Schema<IHabitLog>({
  habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
});

HabitSchema.index({ userId: 1 });
HabitLogSchema.index({ habitId: 1, date: -1 });
HabitLogSchema.index({ userId: 1, date: -1 });
HabitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });

if (mongoose.models.Habit) mongoose.deleteModel("Habit");
export const Habit = mongoose.model<IHabit>("Habit", HabitSchema);

if (mongoose.models.HabitLog) mongoose.deleteModel("HabitLog");
export const HabitLog = mongoose.model<IHabitLog>("HabitLog", HabitLogSchema);
