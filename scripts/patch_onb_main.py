import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/pages/onboarding/OnboardingPage.tsx")
t = p.read_text(encoding="utf-8")

t = t.replace(
    'import { setOnboardingCompleteLocal } from "@/lib/onboardingStorage";',
    'import { setOnboardingCompleteLocal } from "@/lib/onboardingStorage";\nimport { OnboardingEnergyStep } from "./OnboardingEnergyStep";',
)

t = t.replace(
    """const STEPS = [
  "Screen time",
  "Study preference",
  "Daily schedule",
  "Review",
] as const;""",
    """const STEPS = [
  "Screen time",
  "Study preference",
  "Daily schedule",
  "Energy & stress",
  "Review",
] as const;""",
)

insert = """  const [bootLoading, setBootLoading] = useState(true);
  const [burnoutLevel, setBurnoutLevel] = useState<"low" | "medium" | "high">("medium");
  const [sleepQuality, setSleepQuality] = useState<"poor" | "ok" | "good">("ok");
  const [stressFactors, setStressFactors] = useState<string[]>([]);
  const [weeklyStudyHoursTarget, setWeeklyStudyHoursTarget] = useState(10);
  const [interestsText, setInterestsText] = useState("");

"""
if "bootLoading" not in t:
    t = t.replace("  const [err, setErr] = useState<string | null>(null);\n\n  const [mobileHours", "  const [err, setErr] = useState<string | null>(null);\n" + insert + "  const [mobileHours")

t = t.replace(
    """  useEffect(() => {
    void (async () => {
      const p = await fetchServerProfile();
      if (p && p !== "error" && p.onboardingComplete) {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);""",
    """  useEffect(() => {
    void (async () => {
      const p = await fetchServerProfile();
      if (p && p !== "error" && p.onboardingComplete) {
        navigate("/", { replace: true });
      }
      setBootLoading(false);
    })();
  }, [navigate]);""",
)

t = t.replace(
    """      await patchServerProfile({
        onboardingComplete: true,
        screenTime: { mobileHours, laptopHours },
        studyMode,
        wakeTime,
        sleepTime,
        dayBlocks,
        dailyStudyHoursLimit: dailyLimit,
      });""",
    """      await patchServerProfile({
        onboardingComplete: true,
        screenTime: { mobileHours, laptopHours },
        studyMode,
        wakeTime,
        sleepTime,
        dayBlocks,
        dailyStudyHoursLimit: dailyLimit,
        burnoutLevel,
        sleepQuality,
        stressFactors,
        weeklyStudyHoursTarget,
        interests: interestsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        preferredStudyStyle: loadProfile().preferredStudyStyle,
      });""",
)

old_step3 = """        {step === 3 && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-zinc-600">
              Your day map (approximate). Confirm to finish setup.
            </p>
            <DayMapVisual
              wakeTime={wakeTime}
              sleepTime={sleepTime}
              blocks={blocks}
            />
            <ul className="text-sm text-zinc-700 space-y-1">
              <li>
                Screen: {mobileHours}h mobile + {laptopHours}h laptop
              </li>
              <li>
                Preference: {studyMode === "self" ? "Self-study" : "Group study"}
              </li>
            </ul>
          </div>
        )}"""

new_steps = """        {step === 3 && (
          <OnboardingEnergyStep
            burnoutLevel={burnoutLevel}
            setBurnoutLevel={setBurnoutLevel}
            sleepQuality={sleepQuality}
            setSleepQuality={setSleepQuality}
            stressFactors={stressFactors}
            setStressFactors={setStressFactors}
            weeklyStudyHoursTarget={weeklyStudyHoursTarget}
            setWeeklyStudyHoursTarget={setWeeklyStudyHoursTarget}
            interestsText={interestsText}
            setInterestsText={setInterestsText}
          />
        )}

        {step === 4 && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-violet-200/90">
              Your day map (approximate). Confirm to finish setup.
            </p>
            <DayMapVisual
              wakeTime={wakeTime}
              sleepTime={sleepTime}
              blocks={blocks}
            />
            <ul className="text-sm text-violet-200/80 space-y-1">
              <li>
                Screen: {mobileHours}h mobile + {laptopHours}h laptop
              </li>
              <li>
                Preference: {studyMode === "self" ? "Self-study" : "Group study"}
              </li>
              <li>Burnout tendency: {burnoutLevel}</li>
              <li>Sleep: {sleepQuality}</li>
              <li>Weekly target: {weeklyStudyHoursTarget}h</li>
            </ul>
          </div>
        )}"""

if old_step3 in t:
    t = t.replace(old_step3, new_steps)
else:
    raise SystemExit("step3 block not found")

t = t.replace(
    '    <div className="min-h-screen bg-zinc-50 px-4 py-10">',
    '    <div className="min-h-screen bg-[#0c0518] px-4 py-10 text-violet-100">',
)
t = t.replace(
    '      <div className="mx-auto max-w-lg">',
    '      <div className="mx-auto max-w-lg rounded-3xl border border-violet-500/20 bg-zinc-950/60 p-6 shadow-xl sm:p-8">',
)
t = t.replace(
    '        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">',
    '        <p className="text-xs font-medium uppercase tracking-wide text-violet-400/80">',
)
t = t.replace(
    '        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">',
    '        <h1 className="mt-2 text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">',
)

if "bootLoading" in t and "if (bootLoading)" not in t:
    t = t.replace(
        "  return (",
        """  if (bootLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0518] px-4">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-violet-900/40" />
        <p className="mt-6 text-sm text-violet-300/80">Loading your profile…</p>
      </div>
    );
  }

  return (""",
        1,
    )

p.write_text(t, encoding="utf-8")
print("onboarding page patched")
