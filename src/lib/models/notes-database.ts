import mongoose, { Schema, type Document } from "mongoose";

/** A Notion-style database: a typed schema (properties) + rows + saved views.
 * Embedded for atomic MVP simplicity (one document per database). */

export type PropertyType =
  | "title" | "text" | "number" | "select" | "multi_select"
  | "status" | "date" | "checkbox" | "url";

export type ViewType = "table" | "board" | "gallery" | "list" | "calendar";

export interface SelectOption {
  id: string;
  label: string;
  color: string; // one of NOTION_OPTION_COLORS keys
}

export interface DBProperty {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[]; // for select / multi_select / status
}

export interface DBView {
  id: string;
  name: string;
  type: ViewType;
  groupBy?: string; // property id, for board
  hidden?: string[]; // hidden property ids
}

export interface DBRow {
  id: string;
  cells: Record<string, unknown>; // propertyId -> value (string | number | boolean | string[] | dateISO)
}

export interface INotesDatabase extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  icon: string;
  properties: DBProperty[];
  views: DBView[];
  rows: DBRow[];
  createdAt: Date;
  updatedAt: Date;
}

const NotesDatabaseSchema = new Schema<INotesDatabase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Untitled" },
    icon: { type: String, default: "🗂️" },
    properties: { type: Schema.Types.Mixed, default: [] },
    views: { type: Schema.Types.Mixed, default: [] },
    rows: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

if (mongoose.models.NotesDatabase) mongoose.deleteModel("NotesDatabase");
export default mongoose.model<INotesDatabase>("NotesDatabase", NotesDatabaseSchema);
