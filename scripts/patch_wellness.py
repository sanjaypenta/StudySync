import pathlib
root = pathlib.Path(r"e:/StudySync/backend/src")

(root / "services/profileWellness.ts").write_text("""
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
""".strip() + chr(10), encoding="utf-8")

p = root / "models/UserProfileDoc.ts"
t = p.read_text(encoding="utf-8")
if "sleepQuality" not in t:
    t = t.replace(
        "  lastBurnoutTip: string;\n}",
        "  lastBurnoutTip: string;\n  sleepQuality: \"poor\" | \"ok\" | \"good\";\n  stressFactors: string[];\n  weeklyStudyHoursTarget: number;\n}\n",
    )
    t = t.replace(
        "    lastBurnoutTip: { type: String, default: \"\" },\n  },\n  { timestamps: true }",
        """    lastBurnoutTip: { type: String, default: \"\" },
    sleepQuality: {
      type: String,
      enum: [\"poor\", \"ok\", \"good\"],
      default: \"ok\",
    },
    stressFactors: { type: [String], default: [] },
    weeklyStudyHoursTarget: { type: Number, default: 10, min: 1, max: 80 },
  },
  { timestamps: true }""",
    )
    p.write_text(t, encoding="utf-8")

w = root / "routes/wellbeingRoutes.ts"
t = w.read_text(encoding="utf-8")
if "adjustWellnessScore" not in t:
    t = t.replace(
        'import { computeBurnoutScore } from "../services/burnoutScore.js";',
        'import { computeBurnoutScore } from "../services/burnoutScore.js";\nimport { adjustWellnessScore } from "../services/profileWellness.js";',
    )
    t = t.replace(
        """    const { score, state } = computeBurnoutScore({
      completionRate,
      sessionRatio,
      screenStress,
    });

    await BurnoutDaily.findOneAndUpdate(""",
        """    const raw = computeBurnoutScore({
      completionRate,
      sessionRatio,
      screenStress,
    });
    const score = adjustWellnessScore(raw.score, profile);
    let state = raw.state;
    if (score < 45) state = "red";
    else if (score < 70) state = "yellow";
    else state = "green";

    await BurnoutDaily.findOneAndUpdate(""",
    )
    w.write_text(t, encoding="utf-8")

print("backend wellness ok")
