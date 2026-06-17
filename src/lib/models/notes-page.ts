import mongoose, { Schema, type Document } from "mongoose";

export interface INotesPage extends Document {
  userId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  title: string;
  icon: string;
  coverUrl?: string;
  content: unknown; // BlockNote document JSON (array of blocks)
  order: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotesPageSchema = new Schema<INotesPage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "NotesPage", default: null },
    title: { type: String, default: "Untitled" },
    icon: { type: String, default: "📄" },
    coverUrl: { type: String, default: "" },
    content: { type: Schema.Types.Mixed, default: [] },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotesPageSchema.index({ userId: 1, parentId: 1 });
NotesPageSchema.index({ userId: 1, archived: 1 });

if (mongoose.models.NotesPage) mongoose.deleteModel("NotesPage");
export default mongoose.model<INotesPage>("NotesPage", NotesPageSchema);
