import mongoose, { Schema, type Document } from "mongoose";

export interface IStudyRoomDoc extends Document {
  roomId: string;
  hostKey: string;
  topic: string;
  fileText: string;
  questionsCount: number;
  expiresAt: Date;
}

const StudyRoomSchema = new Schema<IStudyRoomDoc>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    hostKey: { type: String, required: true },
    topic: { type: String, default: "" },
    fileText: { type: String, default: "" },
    questionsCount: { type: Number, required: true, min: 1, max: 30 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB will remove expired rooms automatically.
StudyRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const StudyRoomModel = mongoose.model<IStudyRoomDoc>(
  "StudyRoom",
  StudyRoomSchema
);
