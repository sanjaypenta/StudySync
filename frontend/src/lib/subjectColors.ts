const PALETTE = [
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-amber-100 text-amber-900 border-amber-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
];

export function subjectChipClass(subject: string): string {
  let h = 0;
  for (let i = 0; i < subject.length; i++) {
    h = (h + subject.charCodeAt(i) * (i + 1)) % 997;
  }
  return PALETTE[h % PALETTE.length];
}
