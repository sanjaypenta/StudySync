export type SessionMood = "tired" | "normal" | "motivated";

export type BreakPlan = {
  workMinutesBeforeNudge: number;
  breakSuggestionMinutes: number;
  /** If set, copy stresses mandatory recovery length */
  mandatoryBreakMinutes: number | null;
  headline: string;
  body: string;
  energyLine: string;
};

function baseWorkMinutes(mood: SessionMood): number {
  switch (mood) {
    case "tired":
      return 15;
    case "normal":
      return 25;
    case "motivated":
      return 35;
  }
}

/**
 * Energy-aware work block and break suggestion (client-side; pairs with HUD energy bar).
 */
export function getBreakPlan(
  mood: SessionMood,
  energyPercent: number | null
): BreakPlan {
  const e =
    energyPercent != null && Number.isFinite(energyPercent)
      ? Math.max(0, Math.min(100, energyPercent))
      : 50;

  let work = baseWorkMinutes(mood);
  let mandatory: number | null = null;

  if (e > 70) {
    work = Math.round(work * 1.4);
  } else if (e < 40) {
    work = Math.round(work * 0.65);
    mandatory = 5;
  }

  work = Math.max(5, Math.min(90, work));

  const breakSuggestionMinutes = e < 40 ? 8 : e > 70 ? 3 : 5;

  let headline = "Recovery phase";
  let body =
    "Your brain needs recovery. Step away for a few minutes — you earned it.";

  if (e > 70) {
    headline = "Flow surge";
    body =
      "High energy — ride the wave. Optional micro-stretch; keep the momentum.";
  } else if (e >= 40 && e <= 70) {
    headline = "Shield break";
    body = "Short break keeps your stats sustainable. Hydrate, breathe, return sharp.";
  }

  if (mandatory != null) {
    body = `Your brain needs recovery. Take ${mandatory} minutes — the run can wait.`;
  }

  const energyLine =
    e < 40
      ? `Energy sync: ${Math.round(e)}% — recovery recommended.`
      : e > 70
        ? `Energy sync: ${Math.round(e)}% — great time to push.`
        : `Energy sync: ${Math.round(e)}% — balanced pacing.`;

  return {
    workMinutesBeforeNudge: work,
    breakSuggestionMinutes,
    mandatoryBreakMinutes: mandatory,
    headline,
    body,
    energyLine,
  };
}

const TAG_RANK: Record<string, number> = {
  flexible: 0,
  suggested: 1,
  must_do: 2,
};

function tagOrder(t: { priority_tag: string }): number {
  return TAG_RANK[t.priority_tag] ?? 1;
}

/** Self-study list ordering from mood (does not mutate). */
export function sortTodosForMood<
  T extends { hours: number; priority_tag: string; sort_order: number; date: string },
>(list: T[], mood: SessionMood | null): T[] {
  const copy = [...list];
  if (mood === "tired") {
    copy.sort((a, b) => {
      if (a.hours !== b.hours) return a.hours - b.hours;
      return tagOrder(a) - tagOrder(b);
    });
  } else if (mood === "motivated") {
    copy.sort((a, b) => {
      if (a.hours !== b.hours) return b.hours - a.hours;
      return tagOrder(b) - tagOrder(a);
    });
  } else {
    copy.sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        a.date.localeCompare(b.date) ||
        a.hours - b.hours
    );
  }
  return copy;
}
