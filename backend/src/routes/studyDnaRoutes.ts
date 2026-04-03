import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { StudySession } from "../models/StudySession.js";
import { Todo } from "../models/Todo.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";

type DnaStrengthLevel = "strong" | "steady" | "needs";

type DnaStrengthRow = {
  subject: string;
  score: number;
  level: DnaStrengthLevel;
};

type DnaSummary = {
  status: "learning" | "active";
  lastUpdated: string;
  confidence: number;
  peakProductivity: {
    label: string;
    range: string;
  };
  focusDurationMinutes: number;
  burnoutPattern: {
    note: string;
    risk: "green" | "yellow" | "red";
  };
  energyBehavior: {
    note: string;
    trend: number[];
  };
  consistency: {
    daysPerWeek: number;
    score: number;
  };
  strengths: DnaStrengthRow[];
  smartInsights: string[];
};

export const studyDnaRouter = Router();
studyDnaRouter.use(authMiddleware);

function clamp(num: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, num));
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function to12h(hour24: number): { hour: number; suffix: "AM" | "PM" } {
  const h = hour24 % 24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, suffix };
}

function formatHourRange(startHour: number, spanHours = 2): string {
  const endHour = (startHour + spanHours) % 24;
  const s = to12h(startHour);
  const e = to12h(endHour);
  return `${s.hour}:00 ${s.suffix} - ${e.hour}:00 ${e.suffix}`;
}

function levelFromScore(score: number): DnaStrengthLevel {
  if (score >= 70) return "strong";
  if (score >= 45) return "steady";
  return "needs";
}

studyDnaRouter.get("/summary", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const now = new Date();
    const today = toYmd(now);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const sinceStr = toYmd(since);

    const subjectSince = new Date();
    subjectSince.setUTCDate(subjectSince.getUTCDate() - 60);
    const subjectSinceStr = toYmd(subjectSince);

    const [sessions, todos, burnoutRows, profile, todayBurnout] = await Promise.all([
      StudySession.find({
        user_id: userId,
        outcome: "completed",
        ended_at: { $ne: null },
        started_at: { $gte: since },
      })
        .sort({ started_at: -1 })
        .lean(),
      Todo.find({ user_id: userId, date: { $gte: subjectSinceStr } }).lean(),
      BurnoutDaily.find({
        user_id: userId,
        date: { $gte: sinceStr, $lte: today },
      })
        .sort({ date: 1 })
        .lean(),
      UserProfileModel.findOne({ user_id: userId }).lean(),
      BurnoutDaily.findOne({ user_id: userId, date: today }).lean(),
    ]);

    const sessionDurations: number[] = [];
    const minutesByHour = Array.from({ length: 24 }, () => 0);
    const minutesByDate = new Map<string, number>();

    for (const s of sessions) {
      if (!s.started_at || !s.ended_at) continue;
      const minutes = Math.max(
        1,
        Math.round(
          (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
            60000
        )
      );
      sessionDurations.push(minutes);
      const started = new Date(s.started_at);
      const hour = started.getUTCHours();
      minutesByHour[hour] += minutes;
      const dateKey = toYmd(started);
      minutesByDate.set(dateKey, (minutesByDate.get(dateKey) ?? 0) + minutes);
    }

    const uniqueDays = new Set(minutesByDate.keys());
    const sessionCount = sessionDurations.length;

    const sessionScore = clamp(sessionCount / 20, 0, 1);
    const dayScore = clamp(uniqueDays.size / 10, 0, 1);
    const confidence = Number((sessionScore * 0.6 + dayScore * 0.4).toFixed(2));
    const status = confidence < 0.45 ? "learning" : "active";

    const avgFocus =
      sessionDurations.length === 0
        ? 0
        : Math.round(
            sessionDurations.reduce((a, b) => a + b, 0) /
              sessionDurations.length
          );

    let bestHour = 20;
    let bestScore = 0;
    for (let h = 0; h < 24; h += 1) {
      const score = minutesByHour[h] + minutesByHour[(h + 1) % 24];
      if (score > bestScore) {
        bestScore = score;
        bestHour = h;
      }
    }

    const peakRange =
      sessionCount === 0 ? "Learning your peak window" : formatHourRange(bestHour, 2);

    const subjectTotals = new Map<string, { total: number; completed: number }>();
    for (const t of todos) {
      const subject = t.subject?.trim() || "General";
      const entry = subjectTotals.get(subject) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (t.status === "completed") entry.completed += 1;
      subjectTotals.set(subject, entry);
    }

    const strengths: DnaStrengthRow[] = Array.from(subjectTotals.entries())
      .map(([subject, { total, completed }]) => {
        const score = total === 0 ? 0 : Math.round((completed / total) * 100);
        return {
          subject,
          score,
          level: levelFromScore(score),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const daysPerWeek = clamp(Math.round(uniqueDays.size / 4), 0, 7);
    const consistencyScore = clamp(Math.round((uniqueDays.size / 28) * 100), 0, 100);

    const dailyLimit = profile?.dailyStudyHoursLimit ?? 4;
    const heavyThreshold = Math.max(120, Math.round(dailyLimit * 60 * 0.6));

    const dayKeys = Array.from(minutesByDate.keys()).sort();
    let streak = 0;
    let maxStreak = 0;
    let prevDate: string | null = null;
    for (const key of dayKeys) {
      const minutes = minutesByDate.get(key) ?? 0;
      const isHeavy = minutes >= heavyThreshold;
      if (!isHeavy) {
        streak = 0;
        prevDate = key;
        continue;
      }
      if (!prevDate) {
        streak = 1;
      } else {
        const d = new Date(key + "T00:00:00Z");
        const prev = new Date(prevDate + "T00:00:00Z");
        const diff = (d.getTime() - prev.getTime()) / 86400000;
        streak = diff === 1 ? streak + 1 : 1;
      }
      maxStreak = Math.max(maxStreak, streak);
      prevDate = key;
    }

    const burnoutRisk = todayBurnout?.state ?? "green";
    let burnoutNote = "No burnout spikes yet. Keep the recovery gaps steady.";
    if (sessionCount < 4) {
      burnoutNote = "Still learning your burnout rhythm. Keep logging sessions.";
    } else if (maxStreak >= 3) {
      burnoutNote = `Burnout usually shows up after ${maxStreak} consecutive heavy days.`;
    }

    const segmentDefs = [
      { label: "morning", start: 6, end: 10 },
      { label: "late morning", start: 10, end: 13 },
      { label: "afternoon", start: 13, end: 17 },
      { label: "evening", start: 17, end: 20 },
      { label: "late evening", start: 20, end: 23 },
      { label: "night", start: 23, end: 24 },
    ];

    const segmentTotals = segmentDefs.map(() => ({ total: 0, count: 0 }));
    for (const s of sessions) {
      if (!s.started_at || !s.ended_at) continue;
      const start = new Date(s.started_at);
      const minutes = Math.max(
        1,
        Math.round(
          (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
            60000
        )
      );
      const hour = start.getUTCHours();
      const idx = segmentDefs.findIndex(
        (seg) => hour >= seg.start && hour < seg.end
      );
      if (idx >= 0) {
        segmentTotals[idx].total += minutes;
        segmentTotals[idx].count += 1;
      }
    }

    const energyTrend = segmentTotals.map((seg) =>
      seg.count === 0 ? 0 : Math.round(seg.total / seg.count)
    );
    let energyNote = "Not enough sessions to map your energy yet.";
    if (sessionCount >= 4) {
      let minIdx = 0;
      let minVal = Number.POSITIVE_INFINITY;
      segmentTotals.forEach((seg, i) => {
        if (seg.count === 0) return;
        const avg = seg.total / seg.count;
        if (avg < minVal) {
          minVal = avg;
          minIdx = i;
        }
      });
      energyNote = `Your energy dips most in the ${segmentDefs[minIdx].label}.`;
    }

    const insights: string[] = [];
    if (sessionCount >= 4) {
      const peakIsNight = bestHour >= 18 || bestHour <= 2;
      insights.push(
        peakIsNight
          ? "You perform best at night — schedule hard tasks then."
          : "Your mornings are sharp — protect them for hard tasks."
      );
    }

    if (avgFocus > 0) {
      if (avgFocus >= 60) {
        insights.push(
          "Frequent long sessions are nudging burnout. Try 45-minute blocks."
        );
      } else if (avgFocus <= 30) {
        insights.push("Short focus bursts work for you. Stack 2-3 sprints.");
      }
    }

    const weakest = strengths[strengths.length - 1];
    if (weakest && weakest.level === "needs") {
      insights.push(`You are strongest in ${strengths[0].subject}. Give ${weakest.subject} extra reps.`);
    }

    if (burnoutRisk !== "green") {
      insights.push("Your burnout risk is rising. Add a recovery block tomorrow.");
    }

    const smartInsights = insights.filter(Boolean).slice(0, 3);

    const payload: DnaSummary = {
      status,
      lastUpdated: now.toISOString(),
      confidence,
      peakProductivity: {
        label: "Your Brain's Prime Time",
        range: peakRange,
      },
      focusDurationMinutes: avgFocus,
      burnoutPattern: {
        note: burnoutNote,
        risk: burnoutRisk,
      },
      energyBehavior: {
        note: energyNote,
        trend: energyTrend,
      },
      consistency: {
        daysPerWeek,
        score: consistencyScore,
      },
      strengths,
      smartInsights,
    };

    res.json({ summary: payload });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load study dna" });
  }
});
