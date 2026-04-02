import type { IUserProfile } from "../models/UserProfileDoc.js";

export function adjustWellnessScore(
  baseScore: number,
  profile: Pick<
    IUserProfile,
    | "burnoutLevel"
    | "sleepQuality"
    | "stressFactors"
    | "weeklyStudyHoursTarget"
  > | null
): number {
  if (!profile) return clampScore(baseScore);
  let s = baseScore;
  if (profile.burnoutLevel === "high") s -= 12;
  if (profile.burnoutLevel === "low") s += 4;
  if (profile.sleepQuality === "poor") s -= 10;
  if (profile.sleepQuality === "good") s += 5;
  const n = profile.stressFactors?.length ?? 0;
  s -= Math.min(12, n * 2);
  const target = profile.weeklyStudyHoursTarget;
  if (typeof target === "number" && target > 10) s -= 3;
  return clampScore(s);
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
