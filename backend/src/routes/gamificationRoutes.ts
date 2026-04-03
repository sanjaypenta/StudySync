import { Router } from "express";
import mongoose from "mongoose";
import { StudySession } from "../models/StudySession.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getOrCreateStats, tierFromPoints } from "../services/gamification.js";

export const gamificationRouter = Router();
gamificationRouter.use(authMiddleware);

function getEvolution(streak: number): number {
  if (streak >= 100) return 2;
  if (streak >= 50) return 1;
  if (streak >= 10) return 0;
  return -1;
}

/** Calculate live energy from today's sessions (same logic as wellbeingRoutes) */
function calcLiveEnergy(sessions: Array<{
  started_at: Date;
  ended_at?: Date | null;
  session_mood?: string | null;
  pauses?: Array<{ started_at: Date; ended_at?: Date | null }>;
}>): number {
  const today = new Date().toISOString().slice(0, 10);
  const dayStart = new Date(today + "T00:00:00Z").getTime();
  const dayEnd   = new Date(today + "T23:59:59Z").getTime();
  const nowMs    = Date.now();

  let activeDrain = 0;
  // Start cursor at first session — no pre-session recovery credit
  let cursorTimeMs = sessions.length > 0 ? sessions[0].started_at.getTime() : nowMs;

  for (const s of sessions) {
    if (!s.started_at) continue;
    const startMs = s.started_at.getTime();
    // passive recovery between sessions
    if (startMs > cursorTimeMs) {
      activeDrain -= ((startMs - cursorTimeMs) / 60000) * 0.5;
    }
    const sessionEndMs = s.ended_at
      ? s.ended_at.getTime()
      : Math.min(nowMs, dayEnd);

    let activeMins = 0;
    let restMins = 0;
    let lastStart = startMs;
    for (const p of s.pauses ?? []) {
      if (!p.started_at) continue;
      const pStart = p.started_at.getTime();
      const pEnd   = p.ended_at ? p.ended_at.getTime() : sessionEndMs;
      if (pStart <= sessionEndMs) {
        activeMins += Math.max(0, (pStart - lastStart) / 60000);
        restMins   += Math.max(0, (Math.min(pEnd, sessionEndMs) - pStart) / 60000);
        lastStart   = Math.min(pEnd, sessionEndMs);
      }
    }
    if (lastStart < sessionEndMs) {
      activeMins += Math.max(0, (sessionEndMs - lastStart) / 60000);
    }

    let rate = 1.5;
    if (s.session_mood === "tired")     rate = 3.0;
    if (s.session_mood === "motivated") rate = 0.75;

    activeDrain += activeMins * rate - restMins * 1.0;
    cursorTimeMs = Math.max(cursorTimeMs, sessionEndMs);
  }

  // passive recovery after last session until now
  if (nowMs > cursorTimeMs && nowMs <= dayEnd) {
    activeDrain -= ((nowMs - cursorTimeMs) / 60000) * 0.5;
  }

  return Math.max(0, Math.min(100, Math.round(100 - activeDrain)));
}

gamificationRouter.get("/state", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const stats  = await getOrCreateStats(userId);
    const today  = new Date().toISOString().slice(0, 10);

    const dayStart = new Date(today + "T00:00:00Z");
    const dayEnd   = new Date(today + "T23:59:59Z");

    // Fetch today's sessions for live energy calc
    const sessions = await StudySession.find({
      user_id:    userId,
      started_at: { $gte: dayStart, $lte: dayEnd },
    }).sort({ started_at: 1 }).lean();

    console.log(`[energy-debug] userId=${userId} today=${today} sessions=${sessions.length}`);
    if (sessions.length > 0) {
      sessions.forEach((s, i) => {
        console.log(`  session[${i}]: started=${s.started_at?.toISOString()} ended=${s.ended_at?.toISOString() ?? "null"} mood=${s.session_mood} pauses=${s.pauses?.length ?? 0}`);
      });
    }

    const energyPct = calcLiveEnergy(sessions as Parameters<typeof calcLiveEnergy>[0]);
    console.log(`[energy-debug] energyPct=${energyPct}`);

    // Also persist to BurnoutDaily so history still works
    const burnoutState =
      energyPct < 45 ? "red" : energyPct < 70 ? "yellow" : "green";
    const b = await BurnoutDaily.findOneAndUpdate(
      { user_id: userId, date: today },
      { $set: { score: energyPct, state: burnoutState } },
      { upsert: true, new: true }
    ).lean();

    const profile   = await UserProfileModel.findOne({ user_id: userId }).lean();
    const tier      = tierFromPoints(stats.points_total);
    const streak    = stats.current_streak ?? 0;
    const evolution = getEvolution(streak);

    res.json({
      streak:  { current: stats.current_streak, longest: stats.longest_streak },
      points:  stats.points_total,
      tier,
      burnout: {
        state: b?.state ?? burnoutState,
        label:
          burnoutState === "green"  ? "In the zone"    :
          burnoutState === "yellow" ? "Watch balance"  : "Recovery mode",
        score: energyPct,
      },
      energyPercent: energyPct,
      companion: {
        type:      profile?.companion_type ?? null,
        streak,
        evolution,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});

