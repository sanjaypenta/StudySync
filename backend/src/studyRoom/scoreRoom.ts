import type { RoomState } from "./roomStore.js";
import type { LeaderboardRow, MCQ } from "./types.js";

function isCorrect(q: MCQ, selected: string): boolean {
  const a = selected.trim().toLowerCase();
  const ok = q.answer.trim().toLowerCase();
  return a === ok;
}

export function computeLeaderboard(room: RoomState): LeaderboardRow[] {
  const quiz = room.quiz;
  const rows: LeaderboardRow[] = [];

  for (const [userId, u] of room.users) {
    const resp = room.responses[userId] ?? {};
    let score = 0;
    let totalMs = 0;
    for (let i = 0; i < quiz.length; i++) {
      const q = quiz[i];
      const r = resp[i];
      if (r && isCorrect(q, r.answer)) {
        score++;
        totalMs += r.ms;
      } else if (r) {
        totalMs += r.ms;
      }
    }

    rows.push({
      rank: 0,
      userId,
      displayName: u.displayName,
      score,
      totalMs,
      isTop: false,
    });
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.totalMs - b.totalMs;
  });

  rows.forEach((r, i) => {
    r.rank = i + 1;
    r.isTop = i === 0 && rows.length > 0;
  });

  return rows;
}
