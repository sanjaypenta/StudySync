import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useHud } from "@/context/HudContext";

export function GameHUD() {
  const { state: g, loading } = useHud();
  const { user } = useAuth();

  if (loading || !g) {
    return (
      <header className="border-b border-violet-500/20 bg-[#0c0518]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold text-violet-200">StudySync</span>
          <div className="flex gap-2">
            <div className="h-8 w-16 animate-pulse rounded-lg bg-violet-900/40" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-violet-900/40" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-violet-900/40" />
          </div>
        </div>
      </header>
    );
  }

  const burn =
    g.burnout.state === "green"
      ? "from-emerald-400 to-emerald-600"
      : g.burnout.state === "yellow"
        ? "from-amber-400 to-amber-600"
        : g.burnout.state === "red"
          ? "from-rose-400 to-rose-600"
          : "from-zinc-500 to-zinc-600";

  return (
    <header className="sticky top-0 z-50 border-b border-violet-500/25 bg-[#0c0518]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-sm font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">
          StudySync
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          {/* Companion streak chip */}
          {(() => {
            const c = g.companion;
            const isLocked = !c || !c.type || c.evolution === -1;
            const spriteMap: Record<string, string[]> = {
              leaf: ["/media/leaf-base.png", "/media/leaf-evo1.png", "/media/leaf-evo2.png"],
              fire: ["/media/fire-base.png", "/media/fire-evo1.png", "/media/fire-evo2.png"],
              water: ["/media/water-base.png", "/media/water-evo1.png", "/media/water-evo2.png"],
            };
            const src = c?.type && c.evolution >= 0 ? spriteMap[c.type]?.[c.evolution] : null;
            return (
              <div className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-950/50 px-2.5 py-1.5 text-orange-100">
                {isLocked ? (
                  <span className="text-base leading-none select-none">🥚</span>
                ) : (
                  <img
                    src={src ?? ""}
                    alt="companion"
                    className="w-6 h-6 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
                <span className="text-orange-300/80 text-xs">🔥</span>
                <span className="font-mono font-bold text-xs">{c?.streak ?? g.streak.current}</span>
              </div>
            );
          })()}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-amber-100">
            <span className="text-amber-200/80">{g.tier}</span>
            <span className="ml-2 font-mono text-amber-50">{g.points} XP</span>
          </div>
          <div className="hidden min-w-[120px] sm:block">
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-violet-300/70">
              <span>Energy</span>
              <span>{g.energyPercent}%</span>
            </div>
            <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${burn}`}
                style={{ width: `${g.energyPercent}%` }}
              />
            </div>
          </div>
          <Link
            to="/progress"
            className="rounded-lg border border-violet-500/40 px-2 py-1 text-violet-200 hover:bg-violet-950/60"
          >
            Stats
          </Link>
          <Link
            to="/study-dna"
            className="rounded-lg border border-cyan-500/40 px-2 py-1 text-cyan-200 hover:bg-cyan-950/40"
          >
            Study DNA
          </Link>
          <Link
            to="/profile"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-violet-500/40 bg-violet-950/40 text-violet-300 hover:bg-violet-900/60 transition-all font-bold text-sm"
            title="My Profile"
          >
            {user?.displayName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "P"}
          </Link>
        </div>
      </div>
    </header>
  );
}
