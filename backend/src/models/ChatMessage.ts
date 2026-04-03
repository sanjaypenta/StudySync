import mongoose, { Schema, type Document } from "mongoose";

export interface IChatMessage extends Document {
  conversation_id: string; // sorted pair of user IDs: "userId1_userId2"
  sender_id: string;
  recipient_id: string;
  text: string;
  created_at: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    conversation_id: { type: String, required: true, index: true },
    sender_id: { type: String, required: true },
    recipient_id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

ChatMessageSchema.index({ conversation_id: 1, created_at: 1 });

export const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  ChatMessageSchema
);

export function conversationId(a: string, b: string): string {
  return [a, b].sort().join("_");
}
