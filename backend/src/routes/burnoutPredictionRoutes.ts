import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { StudySession } from "../models/StudySession.js";
import { Todo } from "../models/Todo.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";
import { effectiveDailyCap } from "../services/autoRescue.js";
import { calcEnergyFromSessions } from "../services/energyCalc.js";

export const burnoutPredictionRouter = Router();
burnoutPredictionRouter.use(authMiddleware);

type RiskLevel = "low" | "moderate" | "high";
type Trend = "increasing" | "stable" | "decreasing";
type Confidence = "low" | "medium" | "high";

function addDaysYmd(ymd: string, delta: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function riskLevelFromScore(score01: number): RiskLevel {
  if (score01 >= 0.7) return "high";
  if (score01 >= 0.35) return "moderate";
  return "low";
}

function trendFromDelta(delta: number): Trend {
  if (delta > 0.08) return "increasing";
  if (delta < -0.08) return "decreasing";
  return "stable";
}

function estimateTimeToBurnout(score01: number, trend: Trend): string {
  if (score01 < 0.35) return "You're on a sustainable path.";
  if (trend === "decreasing") return "Risk is easing — keep this pace.";
  if (score01 >= 0.85) return "At this pace, burnout likely in ~1–2 days.";
  if (score01 >= 0.7) return "At this pace, burnout likely in ~2–3 days.";
  return "At this pace, burnout likely in ~4–6 days.";
}

function pickTips(level: RiskLevel): string[] {
  if (level === "high") {
    return [
      "Take a lighter day tomorrow.",
      "Focus on must-do tasks first, then stop.",
      "Add a short break between sessions.",
    ];
  }
  if (level === "moderate") {
    return [
      "Add a break between sessions.",
      "Pick easier tasks for your next block.",
      "Aim for consistency over intensity today.",
    ];
  }
  return [
    "Keep the pace steady — small wins compound.",
    "If you feel tired, take a short break early.",
  ];
}

function confidenceFromDays(daysWithAnySignal: number): Confidence {
  if (daysWithAnySignal >= 6) return "high";
  if (daysWithAnySignal >= 3) return "medium";
  return "low";
}

async function adjustTomorrowIfNeeded(input: {
  userId: string;
  today: string;
  riskLevel: RiskLevel;
  trend: Trend;
}): Promise<{ applied: boolean; moved: number; message: string } | null> {
  const { userId, today, riskLevel, trend } = input;
  if (riskLevel === "low") return null;
  if (trend !== "increasing") return null;

  const profile = await UserProfileModel.findOne({ user_id: userId });
  if (!profile) return null;

  const last = (profile as unknown as { lastBurnoutPredictionAdjustDate?: string })
    .lastBurnoutPredictionAdjustDate;
  if (last === today) {
    return { applied: false, moved: 0, message: "" };
  }

  const dailyCap = effectiveDailyCap(profile);
  const targetCap = Math.max(
    0.5,
    riskLevel === "high" ? dailyCap * 0.6 : dailyCap * 0.85
  );

  const tomorrow = addDaysYmd(today, 1);
  const horizonEnd = addDaysYmd(tomorrow, 6);

  const future = await Todo.find({
    user_id: userId,
    status: "pending",
    date: { $gte: tomorrow, $lte: horizonEnd },
  }).sort({ date: 1, sort_order: 1 });

  const dayLoad = new Map<string, number>();
  for (const t of future) {
    dayLoad.set(t.date, (dayLoad.get(t.date) ?? 0) + t.hours);
  }

  const tomorrowLoad = dayLoad.get(tomorrow) ?? 0;
  if (tomorrowLoad <= targetCap) {
    (profile as unknown as { lastBurnoutPredictionAdjustDate?: string }).lastBurnoutPredictionAdjustDate = today;
    await profile.save();
    return { applied: false, moved: 0, message: "" };
  }

  const movable = future
    .filter((t) => t.date === tomorrow)
    .filter((t) => !t.is_boss)
    .filter((t) => t.priority_tag !== "must_do")
    .sort((a, b) => {
      const prio = (x: string) => (x === "flexible" ? 0 : x === "suggested" ? 1 : 2);
      const c = prio(a.priority_tag) - prio(b.priority_tag);
      return c !== 0 ? c : b.sort_order - a.sort_order;
    });

  let moved = 0;
  for (const t of movable) {
    const curLoad = dayLoad.get(tomorrow) ?? 0;
    if (curLoad <= targetCap) break;

    let toDate = horizonEnd;
    for (let i = 1; i <= 6; i++) {
      const d = addDaysYmd(tomorrow, i);
      const load = dayLoad.get(d) ?? 0;
      if (load + t.hours <= dailyCap) {
        toDate = d;
        break;
      }
    }

    const fromDate = t.date;
    t.date = toDate;

    // keep ordering stable: append to end of target day
    const maxSort =
      future
        .filter((x) => x.date === toDate)
        .reduce((m, x) => Math.max(m, x.sort_order ?? 0), 0) + 1;
    t.sort_order = maxSort;

    dayLoad.set(fromDate, (dayLoad.get(fromDate) ?? 0) - t.hours);
    dayLoad.set(toDate, (dayLoad.get(toDate) ?? 0) + t.hours);
    moved++;
  }

  if (moved > 0) {
    await Promise.all(movable.slice(0, moved).map((t) => t.save()));
  }

  (profile as unknown as { lastBurnoutPredictionAdjustDate?: string }).lastBurnoutPredictionAdjustDate = today;
  await profile.save();

  if (moved === 0) return { applied: false, moved: 0, message: "" };
  return {
    applied: true,
    moved,
    message: "Your plan has been adjusted to keep you on track.",
  };
}

async function computeRisk(userId: string, today: string): Promise<{
  score01: number;
  level: RiskLevel;
  warnings: string[];
  confidence: Confidence;
  history: Array<{ date: string; score01: number }>;
}> {
  const from = addDaysYmd(today, -6);
  const to = today;

  const [profile, todos, sessions, energyRows] = await Promise.all([
    UserProfileModel.findOne({ user_id: userId }).lean(),
    Todo.find({ user_id: userId, date: { $gte: from, $lte: to } }).lean(),
    StudySession.find({
      user_id: userId,
      started_at: {
        $gte: new Date(from + "T00:00:00Z"),
        $lte: new Date(to + "T23:59:59Z"),
      },
    })
      .sort({ started_at: 1 })
      .lean(),
    BurnoutDaily.find({ user_id: userId, date: { $gte: from, $lte: to } })
      .sort({ date: 1 })
      .lean(),
  ]);

  const dailyCap = effectiveDailyCap(profile as any);

  const days = Array.from({ length: 7 }, (_, i) => addDaysYmd(from, i));
  const plannedHours = new Map<string, number>();
  const completion = new Map<string, { total: number; done: number }>();

  for (const d of days) {
    plannedHours.set(d, 0);
    completion.set(d, { total: 0, done: 0 });
  }

  for (const t of todos) {
    if (!plannedHours.has(t.date)) continue;
    plannedHours.set(t.date, (plannedHours.get(t.date) ?? 0) + (t.hours ?? 0));
    const c = completion.get(t.date)!;
    c.total += 1;
    if (t.status === "completed") c.done += 1;
  }

  // Energy series: use BurnoutDaily when available; otherwise infer from sessions that day.
  const energyByDay = new Map<string, number>();
  for (const r of energyRows) {
    energyByDay.set(r.date, typeof r.score === "number" ? r.score : 100);
  }
  for (const d of days) {
    if (energyByDay.has(d)) continue;
    const daySessions = sessions.filter((s) => {
      const ymd = new Date(s.started_at).toISOString().slice(0, 10);
      return ymd === d;
    });
    if (daySessions.length === 0) continue;
    const e = calcEnergyFromSessions(daySessions as any).energyPercent;
    energyByDay.set(d, e);
  }

  const workloadSeries = days.map((d) => plannedHours.get(d) ?? 0);
  const completionSeries = days.map((d) => {
    const c = completion.get(d)!;
    return c.total === 0 ? 0.5 : c.done / c.total;
  });
  const energySeries = days.map((d) => energyByDay.get(d)).filter((x): x is number => typeof x === "number");

  const last3 = days.slice(-3);
  const prev3 = days.slice(-6, -3);

  const avgPlannedLast3 = mean(last3.map((d) => plannedHours.get(d) ?? 0));
  const avgPlannedPrev3 = mean(prev3.map((d) => plannedHours.get(d) ?? 0));
  const avgCompLast3 = mean(last3.map((d) => {
    const c = completion.get(d)!;
    return c.total === 0 ? 0.5 : c.done / c.total;
  }));
  const avgCompPrev3 = mean(prev3.map((d) => {
    const c = completion.get(d)!;
    return c.total === 0 ? 0.5 : c.done / c.total;
  }));

  const energyLast3 = last3.map((d) => energyByDay.get(d)).filter((x): x is number => typeof x === "number");
  const energyPrev3 = prev3.map((d) => energyByDay.get(d)).filter((x): x is number => typeof x === "number");
  const avgEnergyLast3 = mean(energyLast3);
  const avgEnergyPrev3 = mean(energyPrev3);

  const warnings: string[] = [];
  let score01 = 0.18;

  // Increasing workload
  if (avgPlannedPrev3 > 0 && avgPlannedLast3 > avgPlannedPrev3 * 1.2) {
    score01 += 0.2;
    warnings.push("Your workload has been rising — consider a lighter day.");
  }

  // Declining completion
  if (avgCompLast3 + 0.0001 < avgCompPrev3 - 0.15) {
    score01 += 0.2;
    warnings.push("Task completion is slipping — reducing load can help.");
  }

  // Irregular study pattern
  const sessionDaysLast3 = new Set(
    sessions
      .map((s) => new Date(s.started_at).toISOString().slice(0, 10))
      .filter((d) => last3.includes(d))
  );
  if (sessionDaysLast3.size <= 1 && avgPlannedLast3 > 0.5) {
    score01 += 0.12;
    warnings.push("Your study pattern looks a bit irregular — try smaller, steadier sessions.");
  }

  // Energy dropping faster than usual
  if (energyLast3.length >= 2 && avgEnergyPrev3 > 0 && avgEnergyLast3 < avgEnergyPrev3 - 10) {
    score01 += 0.22;
    warnings.push("Your energy is dropping faster than usual.");
  }

  // Consecutive heavy days
  const heavy = (d: string) => (plannedHours.get(d) ?? 0) > dailyCap;
  let heavyStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (heavy(days[i])) heavyStreak++;
    else break;
  }
  if (heavyStreak >= 3) {
    score01 += 0.28;
    warnings.push(`You've had ${heavyStreak} heavy days in a row — consider slowing down.`);
  }

  // Limited-data softening
  const daysWithAnySignal = days.filter((d) => {
    const c = completion.get(d)!;
    return (plannedHours.get(d) ?? 0) > 0 || c.total > 0 || energyByDay.has(d);
  }).length;

  const confidence = confidenceFromDays(daysWithAnySignal);
  if (confidence === "low") score01 = Math.min(score01, 0.45);

  score01 = clamp(score01, 0, 1);
  const level = riskLevelFromScore(score01);

  // Build a small risk history from energy + workload as a simple proxy.
  const history = days.map((d) => {
    const w = plannedHours.get(d) ?? 0;
    const e = energyByDay.get(d);
    let s = 0.12;
    if (w > dailyCap) s += 0.22;
    if (typeof e === "number" && e < 60) s += 0.22;
    const c = completion.get(d)!;
    const cr = c.total === 0 ? 0.5 : c.done / c.total;
    if (cr < 0.5) s += 0.18;
    return { date: d, score01: clamp(s, 0, 1) };
  });

  // If no warnings and moderate/high, add a gentle generic one.
  if (warnings.length === 0 && level !== "low") {
    warnings.push("A small adjustment now can keep you feeling steady.");
  }

  return { score01, level, warnings, confidence, history };
}

burnoutPredictionRouter.get("/summary", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Database not connected" });
      return;
    }
    const userId = req.userId!;
    const today = new Date().toISOString().slice(0, 10);

    const current = await computeRisk(userId, today);
    const yesterday = addDaysYmd(today, -1);
    const prev = await computeRisk(userId, yesterday);

    const delta = current.score01 - prev.score01;
    const trend = trendFromDelta(delta);

    const adjustment = await adjustTomorrowIfNeeded({
      userId,
      today,
      riskLevel: current.level,
      trend,
    });

    res.json({
      risk: {
        level: current.level,
        score01: current.score01,
        label:
          current.level === "low"
            ? "Low Risk"
            : current.level === "moderate"
              ? "Moderate Risk"
              : "High Risk",
        confidence: current.confidence,
      },
      timeToBurnout: {
        message: estimateTimeToBurnout(current.score01, trend),
      },
      trend: {
        state: trend,
        message:
          trend === "increasing"
            ? "Risk is increasing"
            : trend === "decreasing"
              ? "Risk is decreasing"
              : "Risk is stable",
      },
      warnings: current.warnings,
      tips: pickTips(current.level).slice(0, 3),
      adjustment: adjustment
        ? {
            applied: adjustment.applied,
            moved: adjustment.moved,
            message: adjustment.message,
          }
        : { applied: false, moved: 0, message: "" },
      riskHistory: current.history,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed" });
  }
});
