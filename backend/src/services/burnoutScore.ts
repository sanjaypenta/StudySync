import type { BurnoutState } from "../models/BurnoutDaily.js";

export type BurnoutInputs = {
  /** 0–1 fraction of todos completed today */
  completionRate: number;
  /** 0–1 fraction of study minutes vs planned (capped) */
  sessionRatio: number;
  /** optional: deviation of screen time from profile baseline, 0 = ok */
  screenStress: number;
};

export function computeBurnoutScore(input: BurnoutInputs): {
  score: number;
  state: BurnoutState;
} {
  const c = clamp(input.completionRate);
  const s = clamp(input.sessionRatio);
  const x = clamp(input.screenStress);

  const score = Math.round(
    100 *
      (0.45 * c + 0.35 * s + 0.2 * (1 - x))
  );

  const clamped = Math.max(0, Math.min(100, score));
  let state: BurnoutState = "green";
  if (clamped < 45) state = "red";
  else if (clamped < 70) state = "yellow";

  return { score: clamped, state };
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
