export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Sunday-start month grid; null = outside current month */
export function getMonthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toYmd(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  const rows: (string | null)[][] = [];
  for (let r = 0; r < cells.length / 7; r++) {
    rows.push(cells.slice(r * 7, r * 7 + 7));
  }
  return rows;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = toYmd(new Date(year, month, 1));
  const to = toYmd(new Date(year, month + 1, 0));
  return { from, to };
}

/** All YYYY-MM-DD strings in grid (non-null) for move-date dropdown */
export function gridDateOptions(grid: (string | null)[][]): string[] {
  const set = new Set<string>();
  for (const row of grid) {
    for (const c of row) {
      if (c) set.add(c);
    }
  }
  return [...set].sort();
}
