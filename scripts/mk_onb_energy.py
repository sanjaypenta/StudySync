import pathlib
root = pathlib.Path(r"e:/StudySync/frontend/src/pages/onboarding")

(root / "OnboardingEnergyStep.tsx").write_text(r"""
import type { BurnoutLevel } from "@/lib/profile";

const STRESS_OPTS = [
  { id: "deadlines", label: "Deadlines" },
  { id: "exams", label: "Exams" },
  { id: "social", label: "Social / FOMO" },
  { id: "sleep", label: "Sleep" },
  { id: "health", label: "Health" },
  { id: "family", label: "Family" },
] as const;

type Props = {
  burnoutLevel: BurnoutLevel;
  setBurnoutLevel: (v: BurnoutLevel) => void;
  sleepQuality: "poor" | "ok" | "good";
  setSleepQuality: (v: "poor" | "ok" | "good") => void;
  stressFactors: string[];
  setStressFactors: (v: string[]) => void;
  weeklyStudyHoursTarget: number;
  setWeeklyStudyHoursTarget: (n: number) => void;
  interestsText: string;
  setInterestsText: (s: string) => void;
};

export function OnboardingEnergyStep({
  burnoutLevel,
  setBurnoutLevel,
  sleepQuality,
  setSleepQuality,
  stressFactors,
  setStressFactors,
  weeklyStudyHoursTarget,
  setWeeklyStudyHoursTarget,
  interestsText,
  setInterestsText,
}: Props) {
  function toggleStress(id: string) {
    setStressFactors(
      stressFactors.includes(id)
        ? stressFactors.filter((x) => x !== id)
        : [...stressFactors, id]
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <p className="text-sm text-violet-200/90">
        These answers tune your <strong className="text-violet-100">burnout</strong> and{" "}
        <strong className="text-violet-100">energy bar</strong> for the whole app — no
        reload needed after you finish.
      </p>

      <div>
        <p className="text-sm font-medium text-violet-100">
          How stressed or drained do you usually feel about school?
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {(
            [
              ["low", "Mostly manageable"],
              ["medium", "Often under pressure"],
              ["high", "Frequently overwhelmed"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setBurnoutLevel(v)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                burnoutLevel === v
                  ? "border-fuchsia-400/70 bg-fuchsia-950/50 text-fuchsia-50 ring-1 ring-fuchsia-400/50"
                  : "border-violet-500/25 bg-zinc-900/40 text-violet-200 hover:border-violet-400/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-violet-100">Sleep quality lately</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["poor", "Poor"],
              ["ok", "OK"],
              ["good", "Good"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setSleepQuality(v)}
              className={`rounded-lg px-3 py-2 text-sm ${
                sleepQuality === v
                  ? "bg-cyan-600 text-white"
                  : "border border-zinc-600 bg-zinc-900/50 text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-violet-100">What tends to spike your stress?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STRESS_OPTS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggleStress(o.id)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                stressFactors.includes(o.id)
                  ? "bg-violet-600 text-white"
                  : "border border-zinc-600 text-zinc-400"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm font-medium text-violet-100">
        Target study hours per week
        <input
          type="number"
          min={1}
          max={60}
          step={1}
          className="mt-1 w-full rounded-xl border border-violet-500/30 bg-black/30 px-3 py-2 text-white"
          value={weeklyStudyHoursTarget}
          onChange={(e) =>
            setWeeklyStudyHoursTarget(Number.parseInt(e.target.value, 10) || 10)
          }
        />
      </label>

      <label className="block text-sm font-medium text-violet-100">
        Subjects or topics you care about (comma-separated)
        <input
          className="mt-1 w-full rounded-xl border border-violet-500/30 bg-black/30 px-3 py-2 text-white placeholder:text-zinc-500"
          value={interestsText}
          onChange={(e) => setInterestsText(e.target.value)}
          placeholder="e.g. Calculus, Biology, Spanish"
        />
      </label>
    </div>
  );
}
""".strip() + "\n", encoding="utf-8")

print("energy step ok")
