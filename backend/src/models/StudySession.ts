import mongoose, { Schema, type Document } from "mongoose";

export type SessionOutcome = "completed" | "skipped" | "abandoned" | "pending";

export type SessionMood = "tired" | "normal" | "motivated";

export interface IStudySession extends Document {
  user_id: string;
  started_at: Date;
  ended_at: Date | null;
  todo_ids: string[];
  outcome: SessionOutcome;
  /** Optional check-in at session start */
  session_mood?: SessionMood | null;
  pauses: { started_at: Date; ended_at: Date | null }[];
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
    session_mood: {
      type: String,
      enum: ["tired", "normal", "motivated"],
      required: false,
    },
    pauses: {
      type: [
        {
          started_at: { type: Date, required: true },
          ended_at: { type: Date, default: null },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

StudySessionSchema.index({ user_id: 1, started_at: -1 });

export const StudySession = mongoose.model<IStudySession>(
  "StudySession",
  StudySessionSchema
);
