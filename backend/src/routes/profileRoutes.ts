import { Router } from "express";
import mongoose from "mongoose";
import { groqChat, groqConfigured } from "../services/groqClient.js";
import { UserProfileModel, type DayBlock } from "../models/UserProfileDoc.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const profileRouter = Router();
profileRouter.use(authMiddleware);

function serialize(p: {
  user_id: string;
  onboardingComplete: boolean;
  screenTimeMobileHours: number;
  screenTimeLaptopHours: number;
  studyMode: "self" | "group";
  wakeTime: string;
  sleepTime: string;
  dayBlocks: DayBlock[];
  dailyStudyHoursLimit: number;
  burnoutLevel: "low" | "medium" | "high";
  preferredStudyStyle: "light" | "intense";
  learnerSummary: string;
  interests: string[];
  lastBurnoutTip: string;
  sleepQuality: "poor" | "ok" | "good";
  stressFactors: string[];
  weeklyStudyHoursTarget: number;
  companion_type: "leaf" | "fire" | "water" | null;
  study_streak: number;
  last_study_date: string;
}) {
  return {
    userId: p.user_id,
    onboardingComplete: p.onboardingComplete,
    screenTime: {
      mobileHours: p.screenTimeMobileHours,
      laptopHours: p.screenTimeLaptopHours,
    },
    studyMode: p.studyMode,
    wakeTime: p.wakeTime,
    sleepTime: p.sleepTime,
    dayBlocks: p.dayBlocks,
    dailyStudyHoursLimit: p.dailyStudyHoursLimit,
    burnoutLevel: p.burnoutLevel,
    preferredStudyStyle: p.preferredStudyStyle,
    learnerSummary: p.learnerSummary ?? "",
    interests: p.interests ?? [],
    lastBurnoutTip: p.lastBurnoutTip ?? "",
    sleepQuality: p.sleepQuality ?? "ok",
    stressFactors: p.stressFactors ?? [],
    weeklyStudyHoursTarget: p.weeklyStudyHoursTarget ?? 10,
    companion_type: p.companion_type ?? null,
    study_streak: p.study_streak ?? 0,
    last_study_date: p.last_study_date ?? "",
  };
}

profileRouter.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        error:
          "Database unavailable. Set MONGO_URI in backend/.env for profile sync.",
      });
      return;
    }
    const userId = req.userId!;
    let doc = await UserProfileModel.findOne({ user_id: userId });
    if (!doc) {
      doc = await UserProfileModel.create({
        user_id: userId,
        onboardingComplete: false,
      });
    }
    res.json({ profile: serialize(doc) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

profileRouter.patch("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }
    const userId = req.userId!;
    const body = req.body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};

    if (typeof body.onboardingComplete === "boolean") {
      updates.onboardingComplete = body.onboardingComplete;
    }
    if (body.screenTime && typeof body.screenTime === "object") {
      const st = body.screenTime as Record<string, unknown>;
      if (typeof st.mobileHours === "number")
        updates.screenTimeMobileHours = st.mobileHours;
      if (typeof st.laptopHours === "number")
        updates.screenTimeLaptopHours = st.laptopHours;
    }
    if (body.studyMode === "self" || body.studyMode === "group") {
      updates.studyMode = body.studyMode;
    }
    if (typeof body.wakeTime === "string") updates.wakeTime = body.wakeTime;
    if (typeof body.sleepTime === "string") updates.sleepTime = body.sleepTime;
    if (Array.isArray(body.dayBlocks)) {
      updates.dayBlocks = body.dayBlocks;
    }
    if (typeof body.dailyStudyHoursLimit === "number") {
      updates.dailyStudyHoursLimit = body.dailyStudyHoursLimit;
    }
    if (
      body.burnoutLevel === "low" ||
      body.burnoutLevel === "medium" ||
      body.burnoutLevel === "high"
    ) {
      updates.burnoutLevel = body.burnoutLevel;
    }
    if (body.preferredStudyStyle === "light" || body.preferredStudyStyle === "intense") {
      updates.preferredStudyStyle = body.preferredStudyStyle;
    }
    if (Array.isArray(body.interests)) {
      updates.interests = (body.interests as unknown[]).map((x) => String(x));
    }
    if (typeof body.learnerSummary === "string") {
      updates.learnerSummary = body.learnerSummary;
    }
    if (body.sleepQuality === "poor" || body.sleepQuality === "ok" || body.sleepQuality === "good") {
      updates.sleepQuality = body.sleepQuality;
    }
    if (Array.isArray(body.stressFactors)) {
      updates.stressFactors = (body.stressFactors as unknown[]).map((x) => String(x));
    }
    if (typeof body.weeklyStudyHoursTarget === "number") {
      updates.weeklyStudyHoursTarget = body.weeklyStudyHoursTarget;
    }
    // companion choice — permanent but set during onboarding
    if (body.companion_type === "leaf" || body.companion_type === "fire" || body.companion_type === "water") {
      const existing = await UserProfileModel.findOne({ user_id: userId });
      // Only set if not already chosen (permanent)
      if (!existing?.companion_type) {
        updates.companion_type = body.companion_type;
      }
    }

    const doc = await UserProfileModel.findOneAndUpdate(
      { user_id: userId },
      { $set: updates, $setOnInsert: { user_id: userId } },
      { new: true, upsert: true }
    );
    if (!doc) {
      res.status(500).json({ error: "Update failed" });
      return;
    }
    res.json({ profile: serialize(doc) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

profileRouter.post("/learner-summary", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }
    const userId = req.userId!;
    if (!groqConfigured()) {
      res.status(503).json({ error: "AI summary not configured — set GROQ_API_KEY in backend/.env" });
      return;
    }
    const doc = await UserProfileModel.findOne({ user_id: userId });
    if (!doc) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const prompt = `Write a short "who you are as a learner" summary (3-4 sentences) for this student based on their onboarding profile. Be warm and specific. No markdown.
Study mode: ${doc.studyMode}
Daily study hours cap: ${doc.dailyStudyHoursLimit}
Burnout tendency: ${doc.burnoutLevel}
Sleep quality: ${doc.sleepQuality ?? "ok"}
Weekly study target (hours): ${doc.weeklyStudyHoursTarget ?? 10}
Stress factors: ${(doc.stressFactors ?? []).join(", ") || "none listed"}
Preferred style: ${doc.preferredStudyStyle}
Screen time: mobile ${doc.screenTimeMobileHours}h, laptop ${doc.screenTimeLaptopHours}h
Interests: ${(doc.interests ?? []).join(", ") || "not specified"}`;
    const text = await groqChat(prompt, "You are a warm student coach. Write a short, personalized learner summary. No markdown.");
    doc.learnerSummary = text.trim();
    await doc.save();
    res.json({ profile: serialize(doc) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate learner summary" });
  }
});
