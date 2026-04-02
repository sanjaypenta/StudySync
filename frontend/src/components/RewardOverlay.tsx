import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useRewards } from "@/context/RewardContext";

export function RewardOverlay() {
  const { queue, dismiss } = useRewards();
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => dismiss(), 4200);
    return () => window.clearTimeout(t);
  }, [current, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[100] flex justify-center px-4">
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.title + (current.subtitle ?? "")}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className={`pointer-events-auto max-w-md rounded-2xl border px-6 py-4 shadow-2xl ${
              current.tierUp
                ? "border-amber-400/60 bg-gradient-to-br from-amber-950/95 to-violet-950/95 text-amber-100"
                : "border-violet-500/40 bg-zinc-950/95 text-violet-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">
              Loot drop
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight">{current.title}</p>
            {current.subtitle ? (
              <p className="mt-1 text-sm text-violet-200/90">{current.subtitle}</p>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss()}
              className="mt-3 text-xs text-violet-400 underline-offset-2 hover:underline"
            >
              Nice!
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
