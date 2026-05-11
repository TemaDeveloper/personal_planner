import mongoose, { Schema, type Document } from "mongoose";

export interface IExerciseSet {
  reps: number;
  weight: number;
}

export interface IExercise {
  name: string;
  sets: IExerciseSet[];
}

export interface IWorkout extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  dayOfWeek: number;
  exercises: IExercise[];
  note?: string;
  createdAt: Date;
}

const ExerciseSetSchema = new Schema<IExerciseSet>(
  {
    reps: { type: Number, required: true, min: 0 },
    weight: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ExerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true, maxlength: 100 },
    sets: { type: [ExerciseSetSchema], default: [] },
  },
  { _id: true }
);

const WorkoutSchema = new Schema<IWorkout>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    dayOfWeek: { type: Number, required: true, min: 1, max: 5 },
    exercises: { type: [ExerciseSchema], default: [] },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

WorkoutSchema.index({ userId: 1, date: -1 });
WorkoutSchema.index({ userId: 1, date: 1 }, { unique: true });

if (mongoose.models.Workout) mongoose.deleteModel("Workout");
export default mongoose.model<IWorkout>("Workout", WorkoutSchema);
