import mongoose, { Schema, type Document } from "mongoose";

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  category: string;
  reimbursed: boolean;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "CAD" },
    description: { type: String, required: true, maxlength: 300 },
    date: { type: Date, required: true },
    category: {
      type: String,
      enum: ["travel", "equipment", "meals", "office", "other"],
      default: "other",
    },
    reimbursed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ExpenseSchema.index({ userId: 1, date: -1 });

if (mongoose.models.Expense) mongoose.deleteModel("Expense");
export default mongoose.model<IExpense>("Expense", ExpenseSchema);
