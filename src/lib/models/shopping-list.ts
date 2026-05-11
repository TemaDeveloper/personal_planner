import mongoose, { Schema, type Document } from "mongoose";

export interface IShoppingItem {
  name: string;
  quantity: number;
  checked: boolean;
  price?: number;
}

export interface IShoppingList extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  items: IShoppingItem[];
  archived: boolean;
  createdAt: Date;
}

const ShoppingListSchema = new Schema<IShoppingList>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, maxlength: 200 },
    items: {
      type: [
        {
          name: { type: String, required: true },
          quantity: { type: Number, default: 1, min: 1 },
          checked: { type: Boolean, default: false },
          price: { type: Number, min: 0 },
        },
      ],
      default: [],
    },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ShoppingListSchema.index({ userId: 1, archived: 1 });

if (mongoose.models.ShoppingList) mongoose.deleteModel("ShoppingList");
export default mongoose.model<IShoppingList>("ShoppingList", ShoppingListSchema);
