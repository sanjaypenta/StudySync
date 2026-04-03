import mongoose, { Schema, type Document } from "mongoose";

export interface IUserConnection extends Document {
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: Date;
  updated_at: Date;
}

const UserConnectionSchema = new Schema<IUserConnection>(
  {
    requester_id: { type: String, required: true, index: true },
    recipient_id: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Compound index to ensure uniqueness of pair
UserConnectionSchema.index({ requester_id: 1, recipient_id: 1 }, { unique: true });

export const UserConnection = mongoose.model<IUserConnection>(
  "UserConnection",
  UserConnectionSchema
);
