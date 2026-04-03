import { useMemo } from "react";
import type { ServerProfile } from "@/lib/api";

type Props = {
  profile: ServerProfile | null | undefined;
};

export function SubjectMasteryPanel({ profile }: Props) {
  const masteries = useMemo(() => {
    if (!profile?.subjectMastery) return [];
    return [...profile.subjectMastery].sort((a, b) => b.currentLevel - a.currentLevel);
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-zinc-950/60 p-5 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wider text-cyan-200/80 font-semibold mb-1">
          Subject Mastery Level
        </h3>
        {profile.isLookingForBuddy !== undefined && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest ${profile.isLookingForBuddy ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border" : "bg-zinc-800 text-zinc-400 border-zinc-700 border"}`}>
            {profile.isLookingForBuddy ? "Looking for Buddy 👀" : "Not Looking for Buddy"}
          </span>
        )}
      </div>
      <p className="mb-4 text-xs text-cyan-100/70">
        Every completed task ranks up your subject mastery. The AI uses this to match you with compatible study buddies.
      </p>

      {masteries.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-center">
          <p className="text-sm text-zinc-400">No subjects mastered yet. Complete some focus sessions!</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {masteries.map((m) => {
            // progress to next level calculation (using same logic as backend: 1 level per 2 tasks or 3 hours)
            // levelFromTasks = floor(tasks / 2), levelFromHours = floor(hours / 3)
            // It's a bit hard to determine the exact progress to next level with two variables, we'll just show total stats.
            return (
              <div key={m.subject} className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">{m.subject}</span>
                  <span className="rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-500/40 px-2 py-0.5 text-xs font-semibold shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    Level {m.currentLevel}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-zinc-400/80">
                  <span>Completed: <strong className="text-zinc-200">{m.tasksCompleted} tasks</strong></span>
                  <span>Hours: <strong className="text-zinc-200">{m.hoursStudied.toFixed(1)}h</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
