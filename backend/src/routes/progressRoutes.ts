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
    let maxFocus = 0;
    for (const s of sessions) {
      if (s.ended_at && s.started_at) {
        const diff = Math.round(
          (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
            60000
        );
        focusMinutes += diff;
        if (diff > maxFocus) maxFocus = diff;
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

    // --- Study DNA Engine Algorithm ---
    let bestTime = "No data yet";
    let avgFocus = 0;
    let weakSubject = "Undiscovered";
    let burnoutPattern = "Resilient";

    // 1. Avg focus
    if (sessions.length > 0) {
      avgFocus = Math.round(focusMinutes / sessions.length);
    }

    // 2. Weak Subject
    const failedTodos = await Todo.find({ user_id: userId, status: { $in: ["skipped", "abandoned"] } }).lean();
    if (failedTodos.length > 0) {
      const subjectCount: Record<string, number> = {};
      for (const t of failedTodos) {
         subjectCount[t.subject] = (subjectCount[t.subject] || 0) + 1;
      }
      weakSubject = Object.entries(subjectCount).sort((a,b) => b[1] - a[1])[0][0];
    }
    
    // 3. Best study time
    if (sessions.length > 0) {
      const hourCounts: Record<string, number> = {};
      for (const s of sessions) {
        if (s.started_at) {
          const hr = new Date(s.started_at).getHours();
          hourCounts[hr] = (hourCounts[hr] || 0) + 1;
        }
      }
      const bestHour = parseInt(Object.entries(hourCounts).sort((a,b) => b[1] - a[1])[0][0], 10);
      const endHour = (bestHour + 2) % 24;
      const formatHr = (h: number) => {
        if (h === 0) return "12 AM";
        if (h === 12) return "12 PM";
        return h > 12 ? `${h-12} PM` : `${h} AM`;
      };
      bestTime = `${formatHr(bestHour)} - ${formatHr(endHour)}`;
    }

    let bTotal = 0;
    let bCount = 0;
    for (const b of burnoutPoints) {
      if (b.score != null) {
        bTotal += b.score;
        bCount++;
      }
    }
    const healthAvg = bCount > 0 ? Math.round(bTotal / bCount) : 100;
    if (healthAvg < 50) burnoutPattern = "Quick Burn";
    else if (healthAvg < 70) burnoutPattern = "Sustainable";
    else burnoutPattern = "Iron Stamina";

    const enduranceRaw = Math.max(15, Math.min(100, Math.round((maxFocus / 120) * 100)));
    const consistencyRaw = Math.max(15, Math.min(100, Math.round((stats.current_streak / 30) * 100)));
    const volumeRaw = Math.max(15, Math.min(100, Math.round((focusMinutes / 300) * 100)));
    const healthRaw = Math.max(15, Math.min(100, healthAvg));
    const resilienceRaw = Math.max(15, Math.min(100, Math.round((stats.points_total / 2500) * 100)));

    const dna = {
      insights: {
        bestTime,
        avgFocus,
        weakSubject,
        burnoutPattern,
      },
      radar: [
        { subject: "Consistency", A: consistencyRaw, fullMark: 100 },
        { subject: "Endurance", A: enduranceRaw, fullMark: 100 },
        { subject: "Volume", A: volumeRaw, fullMark: 100 },
        { subject: "Health", A: healthRaw, fullMark: 100 },
        { subject: "Resilience", A: resilienceRaw, fullMark: 100 },
      ]
    };

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
      dna,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load progress" });
  }
});
