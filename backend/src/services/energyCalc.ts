import type { SessionMood } from "../models/StudySession.js";

export type EnergySessionLike = {
  started_at: Date;
  ended_at?: Date | null;
  session_mood?: SessionMood | string | null;
  pauses?: Array<{ started_at: Date; ended_at?: Date | null }>;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function moodDrainRate(mood: unknown): number {
  // Medium/normal scenario (default)
  const base = 1.5;
  if (mood === "tired") return 3.0;
  if (mood === "motivated") return 0.75;
  return base;
}

/**
 * Computes energy purely from study activity.
 * Rules:
 * - Idle: energy is constant (no passive recovery/decay outside sessions)
 * - Break (pause): energy recovers at a decent rate
 * - Studying: energy drains, scaled by mood
 */
export function calcEnergyFromSessions(
  sessions: EnergySessionLike[],
  opts?: {
    nowMs?: number;
    breakRecoveryRatePerMin?: number;
  }
): { activeDrain: number; energyPercent: number; activeMinutes: number; breakMinutes: number } {
  const nowMs = opts?.nowMs ?? Date.now();
  const breakRecoveryRate = opts?.breakRecoveryRatePerMin ?? 2.0;

  let activeDrain = 0;
  let activeMinutes = 0;
  let breakMinutes = 0;

  for (const s of sessions) {
    if (!s?.started_at) continue;
    const startMs = s.started_at.getTime();
    const sessionEndMs = s.ended_at ? s.ended_at.getTime() : nowMs;
    if (!Number.isFinite(startMs) || !Number.isFinite(sessionEndMs)) continue;
    if (sessionEndMs <= startMs) continue;

    let activeMins = 0;
    let restMins = 0;
    let lastStart = startMs;

    for (const p of s.pauses ?? []) {
      if (!p?.started_at) continue;
      const pStart = p.started_at.getTime();
      const pEnd = p.ended_at ? p.ended_at.getTime() : sessionEndMs;
      if (pStart <= lastStart) {
        // Ignore malformed/overlapping pauses
        continue;
      }
      if (pStart >= sessionEndMs) break;
      activeMins += Math.max(0, (pStart - lastStart) / 60000);
      const clampedEnd = Math.min(pEnd, sessionEndMs);
      restMins += Math.max(0, (clampedEnd - pStart) / 60000);
      lastStart = clampedEnd;
      if (lastStart >= sessionEndMs) break;
    }

    if (lastStart < sessionEndMs) {
      activeMins += Math.max(0, (sessionEndMs - lastStart) / 60000);
    }

    activeMinutes += activeMins;
    breakMinutes += restMins;

    const drainRate = moodDrainRate(s.session_mood);
    const drain = activeMins * drainRate;
    const recover = restMins * breakRecoveryRate;
    activeDrain += drain - recover;
  }

  const energyPercent = clamp(Math.round(100 - activeDrain), 0, 100);
  return { activeDrain, energyPercent, activeMinutes, breakMinutes };
}
