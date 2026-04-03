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

    // Active session drain/recovery is already accurately calculated into
    // b.score by the `recalculateWellbeing` engine right before this is called.

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
