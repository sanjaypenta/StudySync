import { Router } from "express";
import mongoose from "mongoose";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getOrCreateStats, tierFromPoints } from "../services/gamification.js";

export const gamificationRouter = Router();
gamificationRouter.use(authMiddleware);

gamificationRouter.get("/state", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const stats = await getOrCreateStats(userId);
    const today = new Date().toISOString().slice(0, 10);
    const b = await BurnoutDaily.findOne({ user_id: userId, date: today }).lean();
    const tier = tierFromPoints(stats.points_total);
    let energyPct =
      b?.score != null ? Math.max(0, Math.min(100, b.score)) : 100;

    // Account for any active session drain in real-time
    const { StudySession } = await import("../models/StudySession.js");
    const activeSession = await StudySession.findOne({ user_id: userId, outcome: "pending" }).lean();
    if (activeSession && activeSession.started_at) {
      let activeMins = 0;
      let restMins = 0;
      let lastStart = activeSession.started_at.getTime();
      const now = Date.now();
      
      const pauses = activeSession.pauses || [];
      for (const p of pauses) {
         if (!p.started_at) continue;
         const pStart = p.started_at.getTime();
         const pEnd = p.ended_at ? p.ended_at.getTime() : now;
         activeMins += Math.max(0, (pStart - lastStart) / 60000);
         restMins += Math.max(0, (pEnd - pStart) / 60000);
         lastStart = pEnd;
      }
      activeMins += Math.max(0, (now - lastStart) / 60000);

      if (activeMins > 0 || restMins > 0) {
        let drainRate = 0.5; // Normal
        if (activeSession.session_mood === "tired") drainRate = 1.0;
        else if (activeSession.session_mood === "motivated") drainRate = 0.25;
        
        const drain = activeMins * drainRate;
        const recover = restMins * 0.5;
        energyPct = Math.max(0, Math.min(100, energyPct - drain + recover));
      }
    }

    res.json({
      streak: { current: stats.current_streak, longest: stats.longest_streak },
      points: stats.points_total,
      tier,
      burnout: {
        state: b?.state ?? "unknown",
        label:
          b?.state === "green"
            ? "In the zone"
            : b?.state === "yellow"
              ? "Watch balance"
              : b?.state === "red"
                ? "Recovery mode"
                : "Not logged yet",
        score: b?.score,
      },
      energyPercent: Math.round(energyPct),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});
