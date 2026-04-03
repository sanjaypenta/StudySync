import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchServerProfile,
  patchServerProfile,
  postLearnerSummary,
  type DayBlockDto,
} from "@/lib/api";
import { loadProfile, saveProfile } from "@/lib/profile";
import { setOnboardingCompleteLocal } from "@/lib/onboardingStorage";
import { OnboardingEnergyStep } from "./OnboardingEnergyStep";

const STEPS = [
  "Choose companion",
  "Screen time",
  "Study preference",
  "Daily schedule",
  "Energy & stress",
  "Review",
] as const;

function newBlockKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type ScheduleBlock = DayBlockDto & { _key: string };

function parseMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return 0;
  return h * 60 + min;
}

function minutesToLabel(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    void (async () => {
      const p = await fetchServerProfile();
      if (p && p !== "error" && p.onboardingComplete) {
        navigate("/", { replace: true });
      }
      setBootLoading(false);
    })();
  }, [navigate]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [burnoutLevel, setBurnoutLevel] = useState<"low" | "medium" | "high">("medium");
  const [sleepQuality, setSleepQuality] = useState<"poor" | "ok" | "good">("ok");
  const [stressFactors, setStressFactors] = useState<string[]>([]);
  const [weeklyStudyHoursTarget, setWeeklyStudyHoursTarget] = useState(10);
  const [interestsText, setInterestsText] = useState("");
  const [companionType, setCompanionType] = useState<"leaf" | "fire" | "water" | null>(null);

  const [mobileHours, setMobileHours] = useState(3);
  const [laptopHours, setLaptopHours] = useState(4);
  const [studyMode, setStudyMode] = useState<"self" | "group">("self");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(() => [
    {
      _key: newBlockKey(),
      type: "class",
      label: "Classes",
      start: "09:00",
      end: "12:00",
    },
    {
      _key: newBlockKey(),
      type: "meal",
      label: "Lunch",
      start: "12:00",
      end: "13:00",
    },
    {
      _key: newBlockKey(),
      type: "free",
      label: "Free time",
      start: "17:00",
      end: "19:00",
    },
  ]);

  async function finish() {
    setErr(null);
    setSaving(true);
    const dayBlocks: DayBlockDto[] = [
      { type: "wake", label: "Wake", start: wakeTime, end: wakeTime },
      ...blocks.map(({ _key: _k, ...b }) => b),
      { type: "sleep", label: "Sleep", start: sleepTime, end: sleepTime },
    ];
    const totalScreen = mobileHours + laptopHours;
    const dailyLimit = Math.min(
      12,
      Math.max(2, 6 - Math.min(4, totalScreen / 3))
    );
    try {
      await patchServerProfile({
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
        ...(companionType ? { companion_type: companionType } : {}),
      });
      const prev = loadProfile();
      saveProfile({
        ...prev,
        dailyStudyHoursLimit: dailyLimit,
      });
      setOnboardingCompleteLocal(true);
      try {
        await postLearnerSummary();
      } catch {
        /* optional AI */
      }
      navigate("/", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (bootLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0518] px-4">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-violet-900/40" />
        <p className="mt-6 text-sm text-violet-300/80">Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0518] px-4 py-10 text-violet-100">
      <div className="mx-auto max-w-lg rounded-3xl border border-violet-500/20 bg-zinc-950/60 p-6 shadow-xl sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-violet-400/80">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
          Welcome to StudySync
        </h1>

        {/* Step 0 — Choose Companion */}
        {step === 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-violet-300/80">
              Choose your study companion — this is permanent and will evolve as your streak grows!
            </p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { type: "leaf" as const, emoji: "🌿", name: "Leafy", desc: "Leaf Type", bg: "border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-950/50", sel: "ring-2 ring-emerald-400 border-emerald-400" },
                { type: "fire" as const, emoji: "🔥", name: "Blaze", desc: "Fire Type", bg: "border-orange-500/40 bg-orange-950/30 hover:bg-orange-950/50", sel: "ring-2 ring-orange-400 border-orange-400" },
                { type: "water" as const, emoji: "💧", name: "Tide", desc: "Water Type", bg: "border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-950/50", sel: "ring-2 ring-cyan-400 border-cyan-400" },
              ]).map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => setCompanionType(c.type)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 ${c.bg} ${
                    companionType === c.type ? c.sel : ""
                  }`}
                >
                  <img
                    src={`/media/${c.type}-base.png`}
                    alt={c.name}
                    className="w-16 h-16 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <p className="text-sm font-bold text-white">{c.name}</p>
                  <p className="text-[11px] text-white/50">{c.desc}</p>
                </button>
              ))}
            </div>
            {!companionType && (
              <p className="text-center text-xs text-rose-400/80">Pick a companion to continue!</p>
            )}
          </div>
        )}

        {/* Step 1 — Screen time */}
        {step === 1 && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-zinc-600">
              Average daily screen time (hours). Split between phone and
              laptop helps us understand your routine.
            </p>
            <label className="block text-sm font-medium text-zinc-700">
              Mobile
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                value={mobileHours}
                onChange={(e) =>
                  setMobileHours(Number.parseFloat(e.target.value) || 0)
                }
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Laptop / desktop
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                value={laptopHours}
                onChange={(e) =>
                  setLaptopHours(Number.parseFloat(e.target.value) || 0)
                }
              />
            </label>
          </div>
        )}

        {/* Step 2 — Study preference */}
        {step === 2 && (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-zinc-600">
              How do you prefer to study most of the time?
            </p>
            <button
              type="button"
              onClick={() => setStudyMode("self")}
              className={`w-full rounded-xl border px-4 py-4 text-left text-sm ${
                studyMode === "self"
                  ? "border-zinc-900 bg-zinc-100 ring-2 ring-zinc-900"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <span className="font-medium">Self-study</span>
              <span className="mt-1 block text-zinc-500">
                Solo focus, your own pace
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStudyMode("group")}
              className={`w-full rounded-xl border px-4 py-4 text-left text-sm ${
                studyMode === "group"
                  ? "border-zinc-900 bg-zinc-100 ring-2 ring-zinc-900"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <span className="font-medium">Group study</span>
              <span className="mt-1 block text-zinc-500">
                Rooms, quizzes, and peers
              </span>
            </button>
          </div>
        )}

        {/* Step 3 — Daily schedule */}
        {step === 3 && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-zinc-600">
              Map a typical day: wake, sleep, and a few blocks (classes, meals,
              free time).
            </p>
            <div className="flex gap-3">
              <label className="flex-1 text-sm font-medium text-zinc-700">
                Wake
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                />
              </label>
              <label className="flex-1 text-sm font-medium text-zinc-700">
                Sleep
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                />
              </label>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-800">Blocks</p>
              {blocks.map((b) => (
                <div
                  key={b._key}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white p-3"
                >
                  <input
                    className="min-w-[100px] flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
                    value={b.label}
                    onChange={(e) => {
                      setBlocks((prev) =>
                        prev.map((x) =>
                          x._key === b._key ? { ...x, label: e.target.value } : x
                        )
                      );
                    }}
                    placeholder="Label"
                  />
                  <input
                    type="time"
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
                    value={b.start}
                    onChange={(e) => {
                      setBlocks((prev) =>
                        prev.map((x) =>
                          x._key === b._key ? { ...x, start: e.target.value } : x
                        )
                      );
                    }}
                  />
                  <span className="text-zinc-400">–</span>
                  <input
                    type="time"
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
                    value={b.end}
                    onChange={(e) => {
                      setBlocks((prev) =>
                        prev.map((x) =>
                          x._key === b._key ? { ...x, end: e.target.value } : x
                        )
                      );
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    onClick={() =>
                      setBlocks((prev) => prev.filter((x) => x._key !== b._key))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-violet-200 underline hover:text-white"
                onClick={() =>
                  setBlocks((prev) => [
                    ...prev,
                    {
                      _key: newBlockKey(),
                      type: "free",
                      label: "Block",
                      start: "12:00",
                      end: "13:00",
                    },
                  ])
                }
              >
                + Add block
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Energy & stress */}
        {step === 4 && (
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

        {/* Step 5 — Review */}
        {step === 5 && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-violet-200/90">
              Your day map (approximate). Confirm to finish setup.
            </p>
            <DayMapVisual
              wakeTime={wakeTime}
              sleepTime={sleepTime}
              blocks={blocks.map(({ _key: _k, ...b }) => b)}
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
        )}

        {err && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {err}
          </p>
        )}

        <div className="mt-8 flex justify-between gap-3">
          <button
            type="button"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm disabled:opacity-40"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={saving || (step === 0 && !companionType)}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void finish()}
              className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Finish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DayMapVisual({
  wakeTime,
  sleepTime,
  blocks,
}: {
  wakeTime: string;
  sleepTime: string;
  blocks: DayBlockDto[];
}) {
  const dayStart = 6 * 60;
  const dayEnd = 24 * 60;
  const span = dayEnd - dayStart;

  const segments = useMemo(() => {
    const segs: { label: string; left: number; width: number; key: string }[] =
      [];
    const push = (
      label: string,
      start: string,
      end: string,
      key: string
    ) => {
      const a = parseMinutes(start);
      const b = parseMinutes(end);
      if (b <= a) return;
      const left = ((Math.max(a, dayStart) - dayStart) / span) * 100;
      const width = ((Math.min(b, dayEnd) - Math.max(a, dayStart)) / span) * 100;
      if (width <= 0) return;
      segs.push({ label, left, width, key });
    };
    push("Wake", wakeTime, minutesToLabel(parseMinutes(wakeTime) + 30), "w");
    blocks.forEach((b, idx) => {
      push(b.label, b.start, b.end, `${b.label}-${b.start}-${b.end}-${idx}`);
    });
    push("Sleep", minutesToLabel(parseMinutes(sleepTime) - 30), sleepTime, "s");
    return segs;
  }, [wakeTime, sleepTime, blocks]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="relative h-14 w-full overflow-hidden rounded-lg bg-zinc-100">
        {segments.map((s) => (
          <div
            key={s.key}
            title={s.label}
            className="absolute top-1 bottom-1 rounded bg-zinc-700/80 text-[10px] text-white flex items-center justify-center px-0.5 overflow-hidden"
            style={{ left: `${s.left}%`, width: `${s.width}%` }}
          >
            {s.width > 8 ? s.label : ""}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        06:00 — 24:00 (simplified day strip)
      </p>
    </div>
  );
}
