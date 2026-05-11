import mongoose, { Schema, type Document } from "mongoose";

export interface IBook extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  author?: string;
  totalPages: number;
  currentPage: number;
  status: "reading" | "completed" | "want-to-read";
  rating?: number;
  notes?: string;
  createdAt: Date;
}

const BookSchema = new Schema<IBook>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 300 },
    author: { type: String, maxlength: 200 },
    totalPages: { type: Number, default: 0, min: 0 },
    currentPage: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["reading", "completed", "want-to-read"],
      default: "want-to-read",
    },
    rating: { type: Number, min: 1, max: 5 },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

BookSchema.index({ userId: 1, status: 1 });

if (mongoose.models.Book) mongoose.deleteModel("Book");
export default mongoose.model<IBook>("Book", BookSchema);
