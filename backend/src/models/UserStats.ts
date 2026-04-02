import mongoose, { Schema, type Document } from "mongoose";

export interface IUserStats extends Document {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  points_total: number;
  streak_freeze_used_week: string | null;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    current_streak: { type: Number, default: 0, min: 0 },
    longest_streak: { type: Number, default: 0, min: 0 },
    last_activity_date: { type: String, default: null },
    points_total: { type: Number, default: 0, min: 0 },
    streak_freeze_used_week: { type: String, default: null },
  },
  { timestamps: true }
);

export const UserStats = mongoose.model<IUserStats>("UserStats", UserStatsSchema);
