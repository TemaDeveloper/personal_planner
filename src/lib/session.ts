import mongoose from "mongoose";
import { connectDB } from "./db";
import User from "./models/user";

/**
 * Resolves a session user ID to a valid MongoDB ObjectId string.
 * Handles the case where NextAuth stores a UUID instead of MongoDB's _id.
 */
export async function resolveUserId(
  session: { user?: { id?: string; email?: string | null } } | null
): Promise<string | null> {
  if (!session?.user?.id) return null;

  if (mongoose.Types.ObjectId.isValid(session.user.id)) {
    return session.user.id;
  }

  // Fallback: look up by email for UUID-based session tokens
  await connectDB();
  const user = await User.findOne({ email: session.user.email }).lean();
  return user ? (user._id as mongoose.Types.ObjectId).toString() : null;
}
