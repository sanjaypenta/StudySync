import mongoose, { Schema, type Document } from "mongoose";

/** Time block on the daily map (HH:mm strings). */
export interface DayBlock {
  type: "wake" | "class" | "meal" | "free" | "sleep" | "other";
  label: string;
  start: string;
  end: string;
}

export interface IUserProfile extends Document {
  user_id: string;
  onboardingComplete: boolean;
  screenTimeMobileHours: number;
  screenTimeLaptopHours: number;
  studyMode: "self" | "group";
  /** Wake / sleep anchors */
  wakeTime: string;
  sleepTime: string;
  dayBlocks: DayBlock[];
  /** Legacy fields used by calendar / plan generation */
  dailyStudyHoursLimit: number;
  burnoutLevel: "low" | "medium" | "high";
  preferredStudyStyle: "light" | "intense";
  /** Optional AI summary after onboarding */
  learnerSummary: string;
  interests: string[];
  lastBurnoutTip: string;
  sleepQuality: "poor" | "ok" | "good";
  stressFactors: string[];
  weeklyStudyHoursTarget: number;
}


const DayBlockSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["wake", "class", "meal", "free", "sleep", "other"],
      default: "other",
    },
    label: { type: String, default: "" },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    onboardingComplete: { type: Boolean, default: false },
    screenTimeMobileHours: { type: Number, default: 0, min: 0, max: 24 },
    screenTimeLaptopHours: { type: Number, default: 0, min: 0, max: 24 },
    studyMode: { type: String, enum: ["self", "group"], default: "self" },
    wakeTime: { type: String, default: "07:00" },
    sleepTime: { type: String, default: "23:00" },
    dayBlocks: { type: [DayBlockSchema], default: [] },
    dailyStudyHoursLimit: { type: Number, default: 4, min: 0.5, max: 16 },
    burnoutLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    preferredStudyStyle: {
      type: String,
      enum: ["light", "intense"],
      default: "light",
    },
    learnerSummary: { type: String, default: "" },
    interests: { type: [String], default: [] },
    lastBurnoutTip: { type: String, default: "" },
    sleepQuality: {
      type: String,
      enum: ["poor", "ok", "good"],
      default: "ok",
    },
    stressFactors: { type: [String], default: [] },
    weeklyStudyHoursTarget: { type: Number, default: 10, min: 1, max: 80 },
  },
  { timestamps: true }
);

export const UserProfileModel = mongoose.model<IUserProfile>(
  "UserProfile",
  UserProfileSchema
);
