import { useMemo } from "react";

type CompanionType = "leaf" | "fire" | "water";

interface CompanionData {
  type: CompanionType | null;
  streak: number;
  evolution: number; // -1 = locked, 0 = base, 1 = evo1, 2 = evo2
}

const COMPANION_INFO: Record<CompanionType, { name: string; color: string; glow: string; label: string }> = {
  leaf: {
    name: "Leafy",
    color: "from-emerald-500/20 to-green-600/10 border-emerald-500/30",
    glow: "shadow-emerald-500/20",
    label: "Leaf Type",
  },
  fire: {
    name: "Blaze",
    color: "from-orange-500/20 to-red-600/10 border-orange-500/30",
    glow: "shadow-orange-500/20",
    label: "Fire Type",
  },
  water: {
    name: "Tide",
    color: "from-cyan-500/20 to-blue-600/10 border-cyan-500/30",
    glow: "shadow-cyan-500/20",
    label: "Water Type",
  },
};

function getImageSrc(type: CompanionType, evolution: number): string {
  if (evolution === -1) return ""; // locked
  const prefix = type;
  if (evolution === 0) return `/media/${prefix}-base.png`;
  if (evolution === 1) return `/media/${prefix}-evo1.png`;
  return `/media/${prefix}-evo2.png`;
}

function getNextThreshold(streak: number): { next: number; label: string } {
  if (streak < 10) return { next: 10, label: "Hatch" };
  if (streak < 50) return { next: 50, label: "1st Evolution" };
  if (streak < 100) return { next: 100, label: "2nd Evolution" };
  return { next: 100, label: "MAX" };
}

function getEvolutionLabel(evolution: number): string {
  if (evolution === -1) return "Egg";
  if (evolution === 0) return "Base";
  if (evolution === 1) return "Stage 2";
  return "Final Form";
}

function getPrevThreshold(streak: number): number {
  if (streak < 10) return 0;
  if (streak < 50) return 10;
  if (streak < 100) return 50;
  return 100;
}

export function CompanionCard({ companion }: { companion: CompanionData | null }) {
  const info = useMemo(
    () => (companion?.type ? COMPANION_INFO[companion.type] : null),
    [companion]
  );

  if (!companion || !companion.type || !info) {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-zinc-950/60 p-5 flex items-center gap-4">
        <div className="text-4xl animate-bounce">🥚</div>
        <div>
          <p className="text-sm font-bold text-violet-200">No companion yet</p>
          <p className="text-xs text-violet-400/70 mt-0.5">Complete onboarding to choose one!</p>
        </div>
      </div>
    );
  }

  const { streak, evolution } = companion;
  const { next, label: nextLabel } = getNextThreshold(streak);
  const prev = getPrevThreshold(streak);
  const isMaxed = streak >= 100;
  const progress = isMaxed ? 100 : Math.round(((streak - prev) / (next - prev)) * 100);
  const imgSrc = getImageSrc(companion.type, evolution);
  const daysLeft = isMaxed ? 0 : next - streak;

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${info.color} p-5 shadow-lg ${info.glow} flex items-center gap-5`}
    >
      {/* Sprite */}
      <div className="relative shrink-0 flex items-center justify-center w-20 h-20">
        {evolution === -1 ? (
          <span className="text-5xl animate-bounce select-none">🥚</span>
        ) : (
          <img
            src={imgSrc}
            alt={`${companion.type} companion`}
            className="w-full h-full object-contain animate-bounce"
            style={{ imageRendering: "pixelated", animationDuration: "2.5s" }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-black text-white tracking-wide">{info.name}</p>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white/60 bg-white/5">
            {info.label}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-violet-400/30 text-violet-300 bg-violet-500/10">
            {getEvolutionLabel(evolution)}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-orange-300 text-sm">🔥</span>
          <span className="text-sm font-mono font-bold text-white">{streak}</span>
          <span className="text-xs text-white/50">day streak</span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 space-y-1">
          {!isMaxed ? (
            <>
              <div className="flex justify-between text-[10px] text-white/50 uppercase tracking-wide">
                <span>{nextLabel}</span>
                <span>{daysLeft} days left</span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs font-bold text-fuchsia-300 uppercase tracking-widest">
              ✨ Fully Evolved!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
