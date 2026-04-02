# -*- coding: utf-8 -*-
import os
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "backend", "src"))

def w(rel, content):
    p = os.path.join(ROOT, *rel.replace("/", os.sep).split(os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content.rstrip() + "\n")

w("services/gamification.ts", """
import { UserStats } from "../models/UserStats.js";

export type RewardTier = "Bronze" | "Silver" | "Gold";

export function tierFromPoints(points: number): RewardTier {
  if (points >= 300) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function dayDiffUtc(lastYmd: string, todayYmd: string): number {
  const a = new Date(lastYmd + "T12:00:00Z").getTime();
  const b = new Date(todayYmd + "T12:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

export type RewardEvent = {
  pointsEarned: number;
  pointsTotal: number;
  streakAfter: number;
  longestStreak: number;
  tierBefore: RewardTier;
  tierAfter: RewardTier;
  milestones: string[];
};

export async function getOrCreateStats(userId: string) {
  let s = await UserStats.findOne({ user_id: userId });
  if (!s) {
    s = await UserStats.create({ user_id: userId });
  }
  return s;
}

export async function recordMeaningfulActivity(
  userId: string,
  pointsDelta: number
): Promise<RewardEvent> {
  const today = new Date().toISOString().slice(0, 10);
  const stats = await getOrCreateStats(userId);
  const tierBefore = tierFromPoints(stats.points_total);

  stats.points_total += pointsDelta;
  const tierAfter = tierFromPoints(stats.points_total);

  const milestones: string[] = [];
  const last = stats.last_activity_date;

  if (last === today) {
    await stats.save();
    if (tierBefore !== tierAfter) {
      milestones.push(`Promoted to ${tierAfter}!`);
    }
    return {
      pointsEarned: pointsDelta,
      pointsTotal: stats.points_total,
      streakAfter: stats.current_streak,
      longestStreak: stats.longest_streak,
      tierBefore,
      tierAfter,
      milestones,
    };
  }

  if (!last) {
    stats.current_streak = 1;
  } else {
    const diff = dayDiffUtc(last, today);
    if (diff === 1) {
      stats.current_streak += 1;
    } else if (diff === 2) {
      const wk = isoWeekKey(new Date());
      if (stats.streak_freeze_used_week !== wk) {
        stats.current_streak += 1;
        stats.streak_freeze_used_week = wk;
        milestones.push("Streak saved (weekly freeze)");
      } else {
        stats.current_streak = 1;
      }
    } else {
      stats.current_streak = 1;
    }
  }

  stats.longest_streak = Math.max(stats.longest_streak, stats.current_streak);
  stats.last_activity_date = today;
  await stats.save();

  const s = stats.current_streak;
  if ([3, 7, 30].includes(s)) {
    milestones.push(`${s}-day streak milestone`);
  }
  if (tierBefore !== tierAfter) {
    milestones.push(`Promoted to ${tierAfter}!`);
  }

  return {
    pointsEarned: pointsDelta,
    pointsTotal: stats.points_total,
    streakAfter: stats.current_streak,
    longestStreak: stats.longest_streak,
    tierBefore,
    tierAfter,
    milestones,
  };
}

export async function addPointsOnly(
  userId: string,
  pointsDelta: number
): Promise<RewardEvent> {
  const stats = await getOrCreateStats(userId);
  const tierBefore = tierFromPoints(stats.points_total);
  stats.points_total += pointsDelta;
  const tierAfter = tierFromPoints(stats.points_total);
  await stats.save();
  const milestones: string[] = [];
  if (tierBefore !== tierAfter) {
    milestones.push(`Promoted to ${tierAfter}!`);
  }
  return {
    pointsEarned: pointsDelta,
    pointsTotal: stats.points_total,
    streakAfter: stats.current_streak,
    longestStreak: stats.longest_streak,
    tierBefore,
    tierAfter,
    milestones,
  };
}
""")

print("gamification written")
