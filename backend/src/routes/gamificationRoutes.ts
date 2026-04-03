import { Router } from "express";
import mongoose from "mongoose";
import { StudySession } from "../models/StudySession.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getOrCreateStats, tierFromPoints } from "../services/gamification.js";
import { calcEnergyFromSessions } from "../services/energyCalc.js";

export const gamificationRouter = Router();
gamificationRouter.use(authMiddleware);

function getEvolution(streak: number): number {
  if (streak >= 100) return 2;
  if (streak >= 50) return 1;
  if (streak >= 10) return 0;
  return -1;
}

/** Calculate live energy from today's sessions.
 * Rules: idle stays constant, breaks recharge, mood scales drain.
 */
function calcLiveEnergy(
  sessions: Array<{
    started_at: Date;
    ended_at?: Date | null;
    session_mood?: string | null;
    pauses?: Array<{ started_at: Date; ended_at?: Date | null }>;
  }>
): number {
  return calcEnergyFromSessions(sessions, { breakRecoveryRatePerMin: 2.0 }).energyPercent;
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

