import type { BurnoutState } from "../models/BurnoutDaily.js";

export type BurnoutInputs = {
  /** The total amount of energy drain accumulated across all sessions today */
  activeDrain: number;
  /** Number of tasks completed today */
  completedTasks: number;
};

export function computeBurnoutScore(input: BurnoutInputs): {
  score: number;
  state: BurnoutState;
} {
  // We redefine `score` to directly mean Energy (0 to 100)
  let energy = 100;

  // Drain energy based on study time
  energy -= input.activeDrain;

  // Small recovery for completing tasks
  energy += input.completedTasks * 5;

  const clamped = Math.max(0, Math.min(100, Math.round(energy)));
  
  let state: BurnoutState = "green";
  if (clamped < 45) state = "red";
  else if (clamped < 70) state = "yellow";

  return { score: clamped, state };
}
