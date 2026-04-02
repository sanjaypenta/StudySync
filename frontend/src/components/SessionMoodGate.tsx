import { AnimatePresence, motion } from "framer-motion";
import type { SessionMood } from "@/lib/sessionBreakPolicy";

const OPTIONS: {
  mood: SessionMood;
  emoji: string;
  title: string;
  effect: string;
  buff: string;
  accent: string;
}[] = [
  {
    mood: "tired",
    emoji: "\u{1F635}",
    title: "Tired",
    effect: "Lighter blocks first",
    buff: "+Calm routing",
    accent: "from-slate-600/40 to-zinc-700/30 border-slate-500/40",
  },
  {
    mood: "normal",
    emoji: "\u{1F610}",
    title: "Normal",
    effect: "Balanced run",
    buff: "+Steady XP track",
    accent: "from-violet-600/35 to-indigo-700/25 border-violet-500/40",
  },
  {
    mood: "motivated",
    emoji: "\u{1F525}",
    title: "Motivated",
    effect: "Push phase — bigger quests up",
    buff: "+Focus surge route",
    accent: "from-orange-600/40 to-rose-600/30 border-orange-500/45",
  },
];

type Props = {
  open: boolean;
  onPick: (mood: SessionMood) => void;
  onClose: () => void;
  subtitle?: string;
};

export function SessionMoodGate({
  open,
  onPick,
  onClose,
  subtitle = "How are you feeling today? We will tune breaks and task order.",
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mood-gate-title"
            className="relative w-full max-w-lg rounded-2xl border border-violet-500/30 bg-[#0f0820] p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
          >
            <h2
              id="mood-gate-title"
              className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-fuchsia-200"
            >
              Check-in
            </h2>
            <p className="mt-1 text-sm text-violet-200/80">{subtitle}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {OPTIONS.map((o) => (
                <button
                  key={o.mood}
                  type="button"
                  onClick={() => onPick(o.mood)}
                  className={`rounded-xl border bg-gradient-to-br p-4 text-left transition hover:scale-[1.02] hover:brightness-110 ${o.accent}`}
                >
                  <span className="text-2xl" aria-hidden>
                    {o.emoji}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-white">{o.title}</p>
                  <p className="mt-1 text-xs text-violet-200/75">{o.effect}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
                    {o.buff}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
