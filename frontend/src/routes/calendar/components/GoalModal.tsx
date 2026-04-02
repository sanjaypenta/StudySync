import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UserProfile } from "@/lib/profile";
import { previewPdfExtract, type GoalType } from "@/lib/api";

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  defaultDeadline: string;
  profile: UserProfile;
  onProfileChange: (p: UserProfile) => void;
  onGenerate: (input: {
    title: string;
    subject: string;
    deadline: string;
    totalHours: number;
    goalType: GoalType;
    topics: string;
    pdfNotes: string;
    pdfFile: File | null;
    topicsPerDay: number;
  }) => void;
  loading: boolean;
}

export function GoalModal({
  open,
  onClose,
  defaultDeadline,
  profile,
  onProfileChange,
  onGenerate,
  loading,
}: GoalModalProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [totalHours, setTotalHours] = useState(5);
  const [goalType, setGoalType] = useState<GoalType>("other");
  const [topics, setTopics] = useState("");
  const [pdfNotes, setPdfNotes] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [topicsPerDay, setTopicsPerDay] = useState(3);
  const [pdfExtractPreview, setPdfExtractPreview] = useState<string | null>(
    null
  );
  const [pdfExtractChars, setPdfExtractChars] = useState<number | null>(null);
  const [pdfExtractLoading, setPdfExtractLoading] = useState(false);
  const [pdfExtractError, setPdfExtractError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDeadline(defaultDeadline);
    }
  }, [open, defaultDeadline]);

  useEffect(() => {
    if (!pdfFile) {
      setPdfExtractPreview(null);
      setPdfExtractChars(null);
      setPdfExtractError(null);
      return;
    }
    let cancelled = false;
    setPdfExtractLoading(true);
    setPdfExtractError(null);
    void previewPdfExtract(pdfFile)
      .then(({ preview, charCount }) => {
        if (!cancelled) {
          setPdfExtractPreview(preview);
          setPdfExtractChars(charCount);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPdfExtractPreview(null);
          setPdfExtractChars(null);
          setPdfExtractError(
            err instanceof Error ? err.message : "Could not read PDF"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPdfExtractLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pdfFile]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-2xl bg-white text-zinc-900 shadow-xl border border-zinc-200/80"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="p-6 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">
                New study goal
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                We&apos;ll build a day-by-day plan to the deadline.
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  Goal type
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  value={goalType}
                  onChange={(e) =>
                    setGoalType(e.target.value as GoalType)
                  }
                >
                  <option value="assignment">Assignment (split into milestones)</option>
                  <option value="quiz_exam">Quiz / exam (learn + practice + revision)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  Title
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
                  placeholder="e.g. DBMS assignment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  Subject
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
                  placeholder="e.g. Database Systems"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  Topics / syllabus
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 resize-y min-h-[72px]"
                  placeholder="List topics, one per line or comma-separated (e.g. ER diagrams, normalization, SQL)"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  Notes from PDF (paste)
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 resize-y"
                  placeholder="Optional: paste text from your syllabus or slides"
                  value={pdfNotes}
                  onChange={(e) => setPdfNotes(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  PDF file (optional)
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
                  onChange={(e) =>
                    setPdfFile(e.target.files?.[0] ?? null)
                  }
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Max 5 MB. Text is extracted on the server; the file is not stored.
                </p>
                {pdfExtractLoading && (
                  <p className="text-xs text-zinc-500 mt-2">Reading PDF…</p>
                )}
                {pdfExtractError && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                    {pdfExtractError}
                  </p>
                )}
                {pdfExtractPreview && !pdfExtractLoading && (
                  <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                    <p className="text-xs font-medium text-zinc-600 mb-1">
                      Extracted text preview
                      {pdfExtractChars != null && (
                        <span className="font-normal text-zinc-400">
                          {" "}
                          ({pdfExtractChars.toLocaleString()} characters
                          {pdfExtractPreview.length < pdfExtractChars
                            ? ", truncated below"
                            : ""}
                          )
                        </span>
                      )}
                    </p>
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-zinc-700 font-mono leading-relaxed">
                      {pdfExtractPreview}
                    </pre>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                    Deadline
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                    Total hours
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    value={totalHours}
                    onChange={(e) =>
                      setTotalHours(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                    Topics per study day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    value={topicsPerDay}
                    onChange={(e) =>
                      setTopicsPerDay(
                        Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 3))
                      )
                    }
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    For long syllabi (many numbered sections), we group about this many outline items per day; extra days become revision.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 space-y-3">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Your study profile
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500">Max hours / day</label>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
                      value={profile.dailyStudyHoursLimit}
                      onChange={(e) =>
                        onProfileChange({
                          ...profile,
                          dailyStudyHoursLimit:
                            parseFloat(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Burnout sensitivity</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
                      value={profile.burnoutLevel}
                      onChange={(e) =>
                        onProfileChange({
                          ...profile,
                          burnoutLevel: e.target.value as UserProfile["burnoutLevel"],
                        })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Study style</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
                      value={profile.preferredStudyStyle}
                      onChange={(e) =>
                        onProfileChange({
                          ...profile,
                          preferredStudyStyle:
                            e.target.value === "intense" ? "intense" : "light",
                        })
                      }
                    >
                      <option value="light">Light & steady</option>
                      <option value="intense">Intense sprints</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !title.trim() || !subject.trim()}
                onClick={() =>
                  onGenerate({
                    title: title.trim(),
                    subject: subject.trim(),
                    deadline,
                    totalHours,
                    goalType,
                    topics,
                    pdfNotes,
                    pdfFile,
                    topicsPerDay,
                  })
                }
                className="rounded-xl bg-zinc-900 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-zinc-800 transition-colors"
              >
                {loading ? "Generating…" : "Generate plan"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
