import { motion, AnimatePresence } from "framer-motion";
import type { GeneratePlanMeta, PlanDay } from "@/lib/api";
import { subjectChipClass } from "@/lib/subjectColors";

interface PlanPreviewProps {
  open: boolean;
  subject: string;
  plan: PlanDay[];
  meta?: GeneratePlanMeta | null;
  /** Update plan rows (task text and hours) before confirming. */
  onPlanChange?: (plan: PlanDay[]) => void;
  maxHoursPerDay?: number;
  /** Update topic outline in meta (reference only; saved tasks use edited rows above). */
  onMetaChange?: (meta: GeneratePlanMeta) => void;
  onConfirm: () => void;
  onEdit: () => void;
  onClose: () => void;
  saving: boolean;
}

function clampHours(h: number, max: number): number {
  const n = Number.isFinite(h) ? h : 0.25;
  return Math.round(Math.max(0.25, Math.min(max, n)) * 4) / 4;
}

export function PlanPreview({
  open,
  subject,
  plan,
  meta,
  onPlanChange,
  maxHoursPerDay = 12,
  onMetaChange,
  onConfirm,
  onEdit,
  onClose,
  saving,
}: PlanPreviewProps) {
  const chip = subjectChipClass(subject || "Study");
  const editable = Boolean(onPlanChange);

  const updateDay = (index: number, patch: Partial<PlanDay>) => {
    if (!onPlanChange) return;
    onPlanChange(
      plan.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close preview"
          />
          <motion.div
            className="relative w-full max-w-2xl rounded-2xl bg-zinc-950/80 backdrop-blur-xl text-violet-100 shadow-2xl border border-violet-500/30 max-h-[92vh] flex flex-col"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
          >
            <div className="p-5 sm:p-6 border-b border-violet-500/20 shrink-0">
              <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
                Your study plan
              </h2>
              <p className="text-sm text-violet-300/60 mt-1">
                {editable
                  ? "Edit each day’s topic text and hours if needed, then confirm."
                  : "Review daily sessions below, then confirm to add them to your calendar."}
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 style-scrollbar">
              <h3 className="text-xs font-semibold text-violet-400/80 uppercase tracking-wide mb-3">
                Daily sessions ({plan.length})
              </h3>
              <div className="space-y-2.5">
                {plan.map((day, i) => (
                  <motion.div
                    key={`${day.date}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    className="flex flex-col gap-2 rounded-xl border border-violet-500/20 bg-black/20 px-4 py-3.5 shadow-inner"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <p className="text-sm font-semibold text-violet-200 tabular-nums shrink-0">
                        {day.date}
                      </p>
                      {editable ? (
                        <label className="flex items-center gap-2 text-xs text-violet-400/70 shrink-0">
                          <span className="whitespace-nowrap">Hours</span>
                          <input
                            type="number"
                            min={0.25}
                            max={maxHoursPerDay}
                            step={0.25}
                            value={day.hours}
                            onChange={(e) =>
                              updateDay(i, {
                                hours: clampHours(
                                  parseFloat(e.target.value),
                                  maxHoursPerDay
                                ),
                              })
                            }
                            className="w-20 rounded-lg border border-violet-500/30 bg-black/40 px-2 py-1.5 text-sm tabular-nums text-violet-100 focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-colors"
                          />
                        </label>
                      ) : (
                        <span
                          className={`shrink-0 self-start text-xs font-medium px-2.5 py-1.5 rounded-lg border ${chip}`}
                        >
                          {day.hours} hr
                        </span>
                      )}
                    </div>
                    {editable ? (
                      <textarea
                        value={day.task}
                        onChange={(e) =>
                          updateDay(i, { task: e.target.value })
                        }
                        rows={Math.min(
                          8,
                          Math.max(2, 1 + (day.task.match(/\n/g)?.length ?? 0))
                        )}
                        className="w-full rounded-lg border border-violet-500/30 bg-black/40 px-3 py-2 text-sm text-violet-100 leading-relaxed resize-y min-h-[2.75rem] focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-colors"
                        placeholder="Topic or tasks for this day"
                      />
                    ) : (
                      <p className="text-sm text-violet-200/90 leading-relaxed break-words">
                        {day.task}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>

              {meta && (
                <div className="mt-6 pt-4 border-t border-violet-500/20">
                  <p className="text-xs font-medium text-violet-400/80 uppercase tracking-wide mb-2">
                    Source details
                  </p>
                  <div className="rounded-lg border border-violet-500/20 bg-black/20 px-3 py-2 text-xs text-violet-300/80 space-y-1 shadow-inner">
                    <p>
                      {meta.pdfUploaded ? (
                        <>
                          PDF:{" "}
                          <span className="font-medium text-violet-200">
                            {meta.pdfCharsExtracted.toLocaleString()}
                          </span>{" "}
                          chars extracted
                        </>
                      ) : (
                        <>No PDF file (paste-only or topics only).</>
                      )}
                    </p>
                    <p>
                      Context sent to planner:{" "}
                      <span className="font-medium text-violet-200">
                        {meta.contextChars.toLocaleString()}
                      </span>{" "}
                      characters
                    </p>
                    {meta.pdfNote && (
                      <p className="text-amber-300 bg-amber-950/30 border border-amber-500/30 rounded-md px-2 py-1.5">
                        {meta.pdfNote}
                      </p>
                    )}
                  </div>
                  {meta &&
                    (onMetaChange ||
                      Boolean(meta.effectiveTopics?.trim())) && (
                      <div className="mt-2 rounded-lg border border-violet-500/20 bg-black/40 overflow-hidden shadow-inner">
                        <label className="block px-3 py-2 text-xs font-medium text-violet-300 border-b border-violet-500/20 bg-black/20">
                          Topic outline (optional edit)
                        </label>
                        {onMetaChange ? (
                          <textarea
                            value={meta.effectiveTopics ?? ""}
                            onChange={(e) =>
                              onMetaChange({
                                ...meta,
                                effectiveTopics: e.target.value,
                              })
                            }
                            rows={6}
                            className="w-full border-0 bg-transparent px-3 py-2 text-[11px] text-violet-100 font-sans leading-relaxed resize-y min-h-[6rem] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-violet-500/40 transition-colors style-scrollbar"
                            placeholder="One topic per line"
                          />
                        ) : (
                          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-[11px] text-violet-200/90 font-sans style-scrollbar">
                            {meta.effectiveTopics?.trim()}
                          </pre>
                        )}
                      </div>
                    )}
                  {meta.materialTextPreview?.trim() && (
                    <details className="group mt-2 rounded-lg border border-violet-500/20 bg-black/40 shadow-inner">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-violet-300 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden bg-black/20 rounded-t-lg transition-colors hover:bg-violet-950/30">
                        <span className="text-violet-500/80 group-open:rotate-90 transition-transform inline-block">
                          ▸
                        </span>
                        Extracted text preview (notes + PDF)
                      </summary>
                      <pre className="mt-0 max-h-40 overflow-y-auto whitespace-pre-wrap break-words border-t border-violet-500/20 px-3 py-2 text-[11px] text-violet-200/60 font-mono style-scrollbar">
                        {meta.materialTextPreview}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 border-t border-violet-500/20 flex gap-3 justify-end shrink-0 bg-zinc-950/40 rounded-b-2xl">
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2.5 text-sm font-medium text-violet-300 hover:text-violet-100"
              >
                Back to goal form
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onConfirm}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40 hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-900/40"
              >
                {saving ? "Saving…" : "Confirm plan"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
