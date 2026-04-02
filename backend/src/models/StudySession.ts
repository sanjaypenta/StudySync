import mongoose, { Schema, type Document } from "mongoose";

export type SessionOutcome = "completed" | "skipped" | "abandoned" | "pending";

export interface IStudySession extends Document {
  user_id: string;
  started_at: Date;
  ended_at: Date | null;
  todo_ids: string[];
  outcome: SessionOutcome;
}

const StudySessionSchema = new Schema<IStudySession>(
  {
    user_id: { type: String, required: true, index: true },
    started_at: { type: Date, required: true },
    ended_at: { type: Date, default: null },
    todo_ids: { type: [String], default: [] },
    outcome: {
      type: String,
      enum: ["completed", "skipped", "abandoned", "pending"],
      default: "pending",
    },
  },
  { timestamps: true }
);

StudySessionSchema.index({ user_id: 1, started_at: -1 });

export const StudySession = mongoose.model<IStudySession>(
  "StudySession",
  StudySessionSchema
);
