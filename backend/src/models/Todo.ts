import mongoose, { Schema, type Document } from "mongoose";

export type TodoStatus = "pending" | "completed" | "skipped";
export type PriorityTag = "must_do" | "suggested" | "flexible";

export interface ITodo extends Document {
  user_id: string;
  task_title: string;
  subject: string;
  date: string;
  hours: number;
  status: TodoStatus;
  priority_tag: PriorityTag;
  sort_order: number;
  slot_start: string;
  slot_end: string;
  is_boss: boolean;
  boss_hp: number;
  current_hp: number;
}

const TodoSchema = new Schema<ITodo>(
  {
    user_id: { type: String, required: true, index: true },
    task_title: { type: String, required: true },
    subject: { type: String, required: true },
    date: { type: String, required: true, index: true },
    hours: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "skipped"],
      default: "pending",
    },
    priority_tag: {
      type: String,
      enum: ["must_do", "suggested", "flexible"],
      default: "suggested",
    },
    sort_order: { type: Number, default: 0 },
    slot_start: { type: String, default: "" },
    slot_end: { type: String, default: "" },
    is_boss: { type: Boolean, default: false },
    boss_hp: { type: Number, default: 0 },
    current_hp: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TodoSchema.index({ user_id: 1, date: 1 });

export const Todo = mongoose.model<ITodo>("Todo", TodoSchema);
