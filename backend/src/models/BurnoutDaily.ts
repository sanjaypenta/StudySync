import mongoose, { Schema, type Document } from "mongoose";

export type BurnoutState = "green" | "yellow" | "red";

export interface IBurnoutDaily extends Document {
  user_id: string;
  date: string;
  score: number;
  state: BurnoutState;
}

const BurnoutDailySchema = new Schema<IBurnoutDaily>(
  {
    user_id: { type: String, required: true, index: true },
    date: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    state: {
      type: String,
      enum: ["green", "yellow", "red"],
      required: true,
    },
  },
  { timestamps: true }
);

BurnoutDailySchema.index({ user_id: 1, date: 1 }, { unique: true });

export const BurnoutDaily = mongoose.model<IBurnoutDaily>(
  "BurnoutDaily",
  BurnoutDailySchema
);
