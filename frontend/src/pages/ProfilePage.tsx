import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useHud } from "@/context/HudContext";
import {
  fetchServerProfile,
  patchServerProfile,
  type ServerProfile,
} from "@/lib/api";
import { SubjectMasteryPanel } from "@/components/SubjectMasteryPanel";

type CompanionType = "leaf" | "fire" | "water";

const COMPANION_INFO: Record<CompanionType, { name: string; label: string; colors: string; selected: string; sprite: string }> = {
  leaf: { name: "Leafy", label: "Leaf Type", colors: "border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40", selected: "ring-2 ring-emerald-400 border-emerald-400 bg-emerald-950/40", sprite: "/media/leaf-base.png" },
  fire: { name: "Blaze", label: "Fire Type", colors: "border-orange-500/40 bg-orange-950/20 hover:bg-orange-950/40", selected: "ring-2 ring-orange-400 border-orange-400 bg-orange-950/40", sprite: "/media/fire-base.png" },
  water: { name: "Tide", label: "Water Type", colors: "border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-950/40", selected: "ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/40", sprite: "/media/water-base.png" },
};

function getEvolutionSprite(type: CompanionType, evolution: number): string {
  const map: Record<CompanionType, string[]> = {
    leaf: ["/media/leaf-base.png", "/media/leaf-evo1.png", "/media/leaf-evo2.png"],
    fire: ["/media/fire-base.png", "/media/fire-evo1.png", "/media/fire-evo2.png"],
    water: ["/media/water-base.png", "/media/water-evo1.png", "/media/water-evo2.png"],
  };
  return map[type][Math.max(0, evolution)] ?? map[type][0];
}

function getEvolutionLabel(evolution: number) {
  if (evolution === -1) return "🥚 Egg (Study 10 days to hatch!)";
  if (evolution === 0) return "⭐ Base Form";
  if (evolution === 1) return "⭐⭐ Stage 2";
  return "⭐⭐⭐ Final Form";
}

function getNextMilestone(streak: number): { next: number; label: string } | null {
  if (streak < 10) return { next: 10, label: "Hatch" };
  if (streak < 50) return { next: 50, label: "1st Evolution" };
  if (streak < 100) return { next: 100, label: "2nd Evolution" };
  return null;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-violet-200">{title}</h2>
      {subtitle && <p className="text-xs text-violet-400/70 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-violet-500/20 bg-zinc-950/60 p-6 ${className}`}>
      {children}
    </div>
  );
}

const STRESS_OPTIONS = ["Exams", "Assignments", "Procrastination", "Lack of sleep", "Social pressure", "Financial stress", "Health"];

export function ProfilePage() {
  const { user } = useAuth();
  const { state: hudState, refresh: refreshHud } = useHud();
  const [profile, setProfile] = useState<ServerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Editable fields
  const [companionType, setCompanionType] = useState<CompanionType | null>(null);
  const [studyMode, setStudyMode] = useState<"self" | "group">("self");
  const [burnoutLevel, setBurnoutLevel] = useState<"low" | "medium" | "high">("medium");
  const [sleepQuality, setSleepQuality] = useState<"poor" | "ok" | "good">("ok");
  const [weeklyTarget, setWeeklyTarget] = useState(10);
  const [stressFactors, setStressFactors] = useState<string[]>([]);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [isLookingForBuddy, setIsLookingForBuddy] = useState(false);

  useEffect(() => {
    void (async () => {
      // Refresh HUD so companion reflects latest DB state
      void refreshHud();
      const p = await fetchServerProfile();
      if (p && p !== "error") {
        setProfile(p);
        setStudyMode(p.studyMode);
        setBurnoutLevel(p.burnoutLevel);
        setSleepQuality(p.sleepQuality ?? "ok");
        setWeeklyTarget(p.weeklyStudyHoursTarget ?? 10);
        setStressFactors(p.stressFactors ?? []);
        setWakeTime(p.wakeTime);
        setSleepTime(p.sleepTime);
        setCompanionType(p.companion_type ?? null);
        setIsLookingForBuddy(p.isLookingForBuddy ?? false);
      }
      setLoading(false);
    })();
  }, []);

  const companion = hudState?.companion ?? null;
  const companionChoiceLocked = !!companion?.type;

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      const patch: Parameters<typeof patchServerProfile>[0] = {
        studyMode,
        burnoutLevel,
        sleepQuality,
        weeklyStudyHoursTarget: weeklyTarget,
        stressFactors,
        wakeTime,
        sleepTime,
        isLookingForBuddy,
      };
      if (!companionChoiceLocked && companionType) {
        patch.companion_type = companionType;
      }
      await patchServerProfile(patch);
      await refreshHud();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-violet-900/40" />
        <div className="h-48 rounded-2xl bg-violet-950/30" />
        <div className="h-48 rounded-2xl bg-violet-950/30" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
          My Profile
        </h1>
        <p className="mt-1 text-violet-400/70 text-sm">
          {user?.email} · Manage your study identity and companion
        </p>
      </motion.div>

      {/* Companion Section */}
      <Card>
        <SectionHeader
          title="Study Companion"
          subtitle={companionChoiceLocked ? "Your companion is permanent — watch it evolve!" : "Choose your companion — this cannot be changed later!"}
        />

        {companionChoiceLocked && companion?.type ? (
          // Show current companion with evolution info
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={getEvolutionSprite(companion.type, companion.evolution)}
                alt="companion"
                className="w-24 h-24 object-contain drop-shadow-lg"
                style={{ imageRendering: "pixelated", animationDuration: "2.5s" }}
              />
              {companion.evolution >= 0 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-fuchsia-600 border-2 border-zinc-950 flex items-center justify-center text-[10px] font-bold text-white">
                  {companion.evolution + 1}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-black text-white">{COMPANION_INFO[companion.type].name}</p>
                <span className="text-xs font-bold uppercase tracking-widest border border-violet-400/30 text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded">
                  {COMPANION_INFO[companion.type].label}
                </span>
              </div>
              <p className="text-sm text-violet-300/70 mt-1">{getEvolutionLabel(companion.evolution)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-orange-400">🔥</span>
                <span className="font-mono font-bold text-white">{companion.streak}</span>
                <span className="text-xs text-white/40">day streak</span>
              </div>
              {(() => {
                const m = getNextMilestone(companion.streak);
                if (!m) return <p className="text-xs text-fuchsia-300 font-bold mt-2">✨ Fully Evolved!</p>;
                const prev = companion.streak < 10 ? 0 : companion.streak < 50 ? 10 : 50;
                const progress = Math.round(((companion.streak - prev) / (m.next - prev)) * 100);
                return (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px] text-white/40 uppercase">
                      <span>{m.label}</span>
                      <span>{m.next - companion.streak} days left</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          // Companion picker
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(COMPANION_INFO) as CompanionType[]).map((type) => {
              const info = COMPANION_INFO[type];
              const isSelected = companionType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCompanionType(type)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 ${isSelected ? info.selected : info.colors}`}
                >
                  <img
                    src={info.sprite}
                    alt={info.name}
                    className="w-16 h-16 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <p className="text-sm font-bold text-white">{info.name}</p>
                  <p className="text-[11px] text-white/50">{info.label}</p>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Study Preferences */}
      <Card>
        <SectionHeader title="Study Preferences" />
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">Study Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(["self", "group"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setStudyMode(m)}
                  className={`rounded-xl border px-4 py-3 text-sm text-left transition-all ${
                    studyMode === m
                      ? "border-violet-400 bg-violet-900/40 text-violet-100"
                      : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-violet-600/50"
                  }`}
                >
                  <span className="font-semibold">{m === "self" ? "Self-study" : "Group study"}</span>
                  <span className="block text-xs mt-0.5 opacity-60">{m === "self" ? "Solo focus, your pace" : "Rooms, quizzes, peers"}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">
              Weekly Study Target — <span className="text-fuchsia-300">{weeklyTarget}h</span>
            </label>
            <input
              type="range"
              min={1}
              max={60}
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(Number(e.target.value))}
              className="w-full accent-fuchsia-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>1h</span><span>60h</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Sleep Schedule */}
      <Card>
        <SectionHeader title="Daily Schedule" subtitle="Used to calculate your energy and burnout score" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">Wake Time</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full rounded-xl border border-violet-500/25 bg-black/40 px-3 py-2.5 text-white text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">Sleep Time</label>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              className="w-full rounded-xl border border-violet-500/25 bg-black/40 px-3 py-2.5 text-white text-sm outline-none focus:border-violet-400"
            />
          </div>
        </div>
      </Card>

      {/* Wellbeing */}
      <Card>
        <SectionHeader title="Wellbeing Settings" subtitle="Affects your energy calculation and burnout detection" />
        <div className="space-y-5">
          {/* Burnout Level */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">Burnout Tendency</label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((lvl) => {
                const clr = lvl === "low" ? "emerald" : lvl === "medium" ? "amber" : "rose";
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setBurnoutLevel(lvl)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold capitalize transition-all ${
                      burnoutLevel === lvl
                        ? `border-${clr}-400 bg-${clr}-950/50 text-${clr}-200`
                        : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleep Quality */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">Sleep Quality</label>
            <div className="grid grid-cols-3 gap-2">
              {(["poor", "ok", "good"] as const).map((q) => {
                const emoji = q === "poor" ? "😴" : q === "ok" ? "😐" : "😊";
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSleepQuality(q)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold capitalize transition-all flex items-center justify-center gap-1.5 ${
                      sleepQuality === q
                        ? "border-violet-400 bg-violet-900/50 text-violet-100"
                        : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {emoji} {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stress Factors */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-violet-400/70 mb-2">Stress Factors</label>
            <div className="flex flex-wrap gap-2">
              {STRESS_OPTIONS.map((s) => {
                const active = stressFactors.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setStressFactors((prev) =>
                        active ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                      active
                        ? "border-fuchsia-400 bg-fuchsia-950/50 text-fuchsia-200"
                        : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Subject Tracking & Buddy Opt-in */}
      <div className="space-y-4">
        <SectionHeader title="Subject Mastery & Social" subtitle="Track your strengths and opt into the AI study buddy matching" />
        <SubjectMasteryPanel profile={profile} />
        
        <div className="rounded-2xl border border-violet-500/20 bg-zinc-950/60 p-5 mt-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-violet-200">Looking for a Study Buddy?</h3>
            <p className="text-xs text-violet-400/70 mt-1">Allow the AI to match you with users who complement your strengths.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsLookingForBuddy(!isLookingForBuddy)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isLookingForBuddy ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isLookingForBuddy ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Account Info (read-only) */}
      <Card>
        <SectionHeader title="Account" />
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Display Name</span>
            <span className="text-sm font-semibold text-zinc-200">{user?.displayName || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Email</span>
            <span className="text-sm font-semibold text-zinc-200">{user?.email}</span>
          </div>
          {profile?.learnerSummary && (
            <div className="pt-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">AI Learner Summary</span>
              <p className="text-sm text-zinc-300 leading-relaxed">{profile.learnerSummary}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-6 pt-4 bg-gradient-to-t from-[#0c0518] via-[#0c0518]/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          {err && <p className="text-sm text-rose-400">{err}</p>}
          {saved && <p className="text-sm text-emerald-400">✓ Saved!</p>}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || (!companionChoiceLocked && !companionType)}
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
