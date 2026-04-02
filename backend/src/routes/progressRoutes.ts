import { Router } from "express";
import mongoose from "mongoose";
import { Todo } from "../models/Todo.js";
import { StudySession } from "../models/StudySession.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getOrCreateStats, tierFromPoints } from "../services/gamification.js";

export const progressRouter = Router();
progressRouter.use(authMiddleware);

progressRouter.get("/summary", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const stats = await getOrCreateStats(userId);
    const profile = await UserProfileModel.findOne({ user_id: userId });
    const today = new Date().toISOString().slice(0, 10);
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 6);
    const fromStr = from.toISOString().slice(0, 10);

    const [todoCompleted, sessions] = await Promise.all([
      Todo.countDocuments({ user_id: userId, status: "completed" }),
      StudySession.find({
        user_id: userId,
        outcome: "completed",
        ended_at: { $ne: null },
      })
        .sort({ ended_at: -1 })
        .limit(50)
        .lean(),
    ]);

    let focusMinutes = 0;
    for (const s of sessions) {
      if (s.ended_at && s.started_at) {
        focusMinutes += Math.round(
          (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
            60000
        );
      }
    }

    const burnoutPoints = await BurnoutDaily.find({
      user_id: userId,
      date: { $gte: fromStr, $lte: today },
    })
      .sort({ date: 1 })
      .lean();

    const todayBurnout = await BurnoutDaily.findOne({
      user_id: userId,
      date: today,
    }).lean();

    res.json({
      streak: {
        current: stats.current_streak,
        longest: stats.longest_streak,
      },
      points: stats.points_total,
      tier: tierFromPoints(stats.points_total),
      todosCompleted: todoCompleted,
      focusMinutesTotal: focusMinutes,
      burnout: {
        today: todayBurnout
          ? { score: todayBurnout.score, state: todayBurnout.state }
          : null,
        last7: burnoutPoints.map((b) => ({
          date: b.date,
          score: b.score,
          state: b.state,
        })),
      },
      learnerSummary: profile?.learnerSummary ?? "",
      lastBurnoutTip: profile?.lastBurnoutTip ?? "",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load progress" });
  }
});
