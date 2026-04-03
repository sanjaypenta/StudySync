import { Router } from "express";
import mongoose from "mongoose";
import { Todo } from "../models/Todo.js";
import { StudySession } from "../models/StudySession.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";
import { computeBurnoutScore } from "../services/burnoutScore.js";
import { adjustWellnessScore } from "../services/profileWellness.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const wellbeingRouter = Router();
wellbeingRouter.use(authMiddleware);

function addDays(ymd: string, delta: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Recompute today's burnout snapshot and persist. */
wellbeingRouter.post("/recalculate", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const today = new Date().toISOString().slice(0, 10);

    const todos = await Todo.find({ user_id: userId, date: today });
    const total = todos.length;
    const completed = todos.filter((t) => t.status === "completed").length;
    const completionRate = total === 0 ? 0.5 : completed / total;

    const dayStart = new Date(today + "T00:00:00Z").getTime();
    const dayEnd = new Date(today + "T23:59:59Z").getTime();
    const sessions = await StudySession.find({
      user_id: userId,
      started_at: { $gte: new Date(dayStart), $lte: new Date(dayEnd) },
    });
    const nowMs = Date.now();
    let sessionMinutes = 0;
    let activeDrain = 0;
    
    for (const s of sessions) {
      if (!s.started_at) continue;
      let activeMins = 0;
      let restMins = 0;
      let lastStart = s.started_at.getTime();
      const sessionEndMs = s.ended_at ? s.ended_at.getTime() : Math.min(nowMs, dayEnd);
      
      const pauses = s.pauses || [];
      for (const p of pauses) {
         if (!p.started_at) continue;
         const pStart = p.started_at.getTime();
         const pEnd = p.ended_at ? p.ended_at.getTime() : sessionEndMs;
         if (pStart <= sessionEndMs) {
           activeMins += Math.max(0, (pStart - lastStart) / 60000);
           const clampedPEnd = Math.min(pEnd, sessionEndMs);
           restMins += Math.max(0, (clampedPEnd - pStart) / 60000);
           lastStart = clampedPEnd;
         }
      }
      if (lastStart < sessionEndMs) {
        activeMins += Math.max(0, (sessionEndMs - lastStart) / 60000);
      }

      sessionMinutes += activeMins;
      
      let rate = 0.5; // Normal
      if (s.session_mood === "tired") rate = 1.0;
      else if (s.session_mood === "motivated") rate = 0.25;
      
      const drain = activeMins * rate;
      const recover = restMins * 0.5;
      
      // we reduce activeDrain by the recover amount. In burnoutScore, energy -= activeDrain.
      // So lowering activeDrain gives the user their energy back!
      activeDrain += (drain - recover);
    }
    const plannedMinutes = todos.reduce((a, t) => a + t.hours * 60, 0);
    const sessionRatio =
      plannedMinutes <= 0 ? 0.6 : Math.min(1, sessionMinutes / plannedMinutes);

    const profile = await UserProfileModel.findOne({ user_id: userId });

    const raw = computeBurnoutScore({
      activeDrain,
      completedTasks: completed,
    });
    
    // adjustWellnessScore will subtract points for poor profile stressors
    // Since energy is max 100, subtracting stress points lowers daily ceiling.
    const score = adjustWellnessScore(raw.score, profile);
    
    let state = raw.state;
    if (score < 45) state = "red";
    else if (score < 70) state = "yellow";
    else state = "green";

    await BurnoutDaily.findOneAndUpdate(
      { user_id: userId, date: today },
      { $set: { score, state } },
      { upsert: true, new: true }
    );

    res.json({
      today: { date: today, score, state },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Recalculate failed" });
  }
});

wellbeingRouter.get("/history", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const days = Math.min(
      14,
      Math.max(1, parseInt(String(req.query.days ?? "7"), 10) || 7)
    );
    const today = new Date().toISOString().slice(0, 10);
    const from = addDays(today, -(days - 1));

    const rows = await BurnoutDaily.find({
      user_id: userId,
      date: { $gte: from, $lte: today },
    })
      .sort({ date: 1 })
      .lean();

    res.json({
      points: rows.map((r) => ({
        date: r.date,
        score: r.score,
        state: r.state,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "History failed" });
  }
});

wellbeingRouter.get("/intervention", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ level: "unknown", message: "" });
      return;
    }
    const userId = req.userId!;
    const today = new Date().toISOString().slice(0, 10);
    const doc = await BurnoutDaily.findOne({ user_id: userId, date: today });
    if (!doc) {
      res.json({ level: "unknown", message: "" });
      return;
    }
    let message = "";
    if (doc.state === "yellow") {
      message =
        "You are at elevated risk. Consider lighter tasks today and short breaks.";
    } else if (doc.state === "red") {
      message =
        "Burnout risk is high. We will cap tomorrow's suggested load. Take a rest block if you can.";
    }
    res.json({
      level: doc.state,
      score: doc.score,
      message,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Intervention failed" });
  }
});
