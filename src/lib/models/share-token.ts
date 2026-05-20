import mongoose, { Schema, type Document } from "mongoose";
import { z } from "zod/v4";

export interface IShareToken extends Document {
  token: string;
  ownerId: mongoose.Types.ObjectId;
  sectionType: string;
  scopeFilter: string | null;
  inviteeEmail: string | null;
  permission: "view";
  expiresAt: Date | null;
  revokedAt: Date | null;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShareTokenSchema = new Schema<IShareToken>(
  {
    token: { type: String, required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sectionType: { type: String, required: true },
    scopeFilter: { type: String, default: null },
    inviteeEmail: { type: String, default: null },
    permission: { type: String, enum: ["view"], default: "view" },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    label: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: true }
);

ShareTokenSchema.index({ token: 1 }, { unique: true });
ShareTokenSchema.index({ ownerId: 1 });
ShareTokenSchema.index({ inviteeEmail: 1 });

if (mongoose.models.ShareToken) mongoose.deleteModel("ShareToken");
export default mongoose.model<IShareToken>("ShareToken", ShareTokenSchema);

export const shareTokenCreateSchema = z.object({
  sectionType: z.string().min(1),
  scopeFilter: z.string().optional(),
  inviteeEmail: z.email().optional(),
  label: z.string().max(200).optional(),
  expiresAt: z.string().datetime().optional(),
});
