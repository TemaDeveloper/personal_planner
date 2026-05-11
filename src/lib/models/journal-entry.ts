import mongoose, { Schema, type Document } from "mongoose";

export interface IJournalEntry extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  content: string;
  mood: number;
  createdAt: Date;
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    content: { type: String, required: true, maxlength: 10000 },
    mood: { type: Number, min: 1, max: 5, default: 3 },
  },
  { timestamps: true }
);

JournalEntrySchema.index({ userId: 1, date: -1 }, { unique: true });

if (mongoose.models.JournalEntry) mongoose.deleteModel("JournalEntry");
export default mongoose.model<IJournalEntry>("JournalEntry", JournalEntrySchema);
