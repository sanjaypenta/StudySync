import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useStudyRoomSocket } from "../../hooks/useStudyRoomSocket";

function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 300);
    return () => window.clearInterval(id);
  }, []);
  const sec = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return <span className="tabular-nums font-mono">{sec}s</span>;
}

export function StudyRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const fromNav = (
    location.state as { username?: string } | undefined
  )?.username;

  const [username, setUsername] = useState(fromNav ?? "");
  const [draftName, setDraftName] = useState("");
  const [joined, setJoined] = useState(Boolean(fromNav?.trim()));

  const hostKey =
    roomId && typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(`studyRoom_hostKey_${roomId}`)
      : null;

  const ready = Boolean(roomId?.trim() && joined && username.trim());

  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const {
    connected,
    error,
    isHost,
    lobbyUsers,
    phase,
    currentQuestion,
    totalQuestions,
    leaderboard,
    feedback,
    startQuiz,
    submitAnswer,
  } = useStudyRoomSocket(
    ready ? roomId : undefined,
    ready ? username : undefined,
    hostKey
  );

  useEffect(() => {
    setSelectedOption(null);
  }, [currentQuestion?.index]);

  const roomLabel = useMemo(() => roomId ?? "", [roomId]);

  function enterRoom(e: React.FormEvent) {
    e.preventDefault();
    const n = draftName.trim();
    if (!n) return;
    setUsername(n);
    setJoined(true);
  }

  if (!roomId || !/^\d{6}$/.test(roomId)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-zinc-700">Invalid room code.</p>
          <Link to="/study-room/join" className="mt-4 inline-block text-sm text-zinc-900 underline">
            Join a room
          </Link>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-10">
        <div className="mx-auto max-w-md">
          <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Dashboard
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-zinc-900">
            Room {roomLabel}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Enter the name others will see in the lobby.
          </p>
          <form onSubmit={enterRoom} className="mt-6 space-y-4">
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 text-white py-3 text-sm font-medium"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Dashboard
          </Link>
          <div className="text-sm text-zinc-600">
            Room <span className="font-mono font-semibold">{roomLabel}</span>
            {!connected && (
              <span className="ml-2 text-amber-700">Connecting…</span>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {phase === "lobby" && (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Lobby</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Share code <span className="font-mono font-medium">{roomLabel}</span>{" "}
              so friends can join.
            </p>
            <ul className="mt-4 space-y-2">
              {lobbyUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span>{u.displayName}</span>
                  {u.isHost && (
                    <span className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Host
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {isHost && (
              <button
                type="button"
                onClick={() => startQuiz()}
                disabled={!connected || lobbyUsers.length < 1}
                className="mt-6 w-full rounded-xl bg-zinc-900 text-white py-3 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                Start quiz
              </button>
            )}
            {!isHost && (
              <p className="mt-6 text-sm text-zinc-500">
                Waiting for the host to start the quiz…
              </p>
            )}
          </section>
        )}

        {phase === "quiz" && currentQuestion && (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Question {currentQuestion.index + 1} / {currentQuestion.total}
              </p>
              <p className="text-sm text-zinc-700">
                Time left: <Countdown endsAt={currentQuestion.endsAt} />
              </p>
            </div>
            <h2 className="mt-4 text-lg font-medium text-zinc-900 leading-snug">
              {currentQuestion.question}
            </h2>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {currentQuestion.options.map((opt) => {
                const picked = selectedOption === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedOption(opt)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      picked
                        ? "border-zinc-900 bg-zinc-100 ring-2 ring-zinc-900 ring-offset-2"
                        : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSelectedOption(null)}
                className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => submitAnswer(selectedOption ?? "")}
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Clear resets your choice. Next submits and moves you to your next
              question immediately; other players stay on theirs. If you do not
              press Next, the timer will submit an empty answer when it runs
              out.
            </p>
          </section>
        )}

        {phase === "quiz_waiting" && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-amber-950">
              You finished all {totalQuestions} questions
            </p>
            <p className="mt-3 text-sm text-amber-900">
              Waiting for everyone else to finish their quiz… Results will
              appear here when the last person is done.
            </p>
          </section>
        )}

        {phase === "results" && (
          <section className="mt-8 space-y-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Leaderboard</h2>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-100">
                    <th className="pb-2 pr-2">#</th>
                    <th className="pb-2 pr-2">Name</th>
                    <th className="pb-2 pr-2">Score</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr
                      key={row.userId}
                      className={
                        row.isTop
                          ? "bg-amber-50 font-medium"
                          : "border-t border-zinc-50"
                      }
                    >
                      <td className="py-2 pr-2">{row.rank}</td>
                      <td className="py-2 pr-2">
                        {row.displayName}
                        {row.isTop && (
                          <span className="ml-2 text-amber-700" aria-hidden>
                            👑
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2">{row.score}</td>
                      <td className="py-2">
                        {(row.totalMs / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Your feedback
              </h2>
              {!feedback && (
                <p className="mt-2 text-sm text-zinc-500">
                  Generating personalized feedback…
                </p>
              )}
              {feedback && (
                <div className="mt-4 space-y-4 text-sm text-zinc-800">
                  <p>
                    <span className="font-medium text-zinc-900">Score: </span>
                    {feedback.score}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-900">Strengths: </span>
                    {feedback.strengths}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-900">Growth: </span>
                    {feedback.weakness}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-900">Tips: </span>
                    {feedback.tips}
                  </p>
                  {feedback.mistakes.length > 0 && (
                    <div>
                      <p className="font-medium text-zinc-900">Mistakes</p>
                      <ul className="mt-2 space-y-3 list-disc pl-5">
                        {feedback.mistakes.map((m, i) => (
                          <li key={i}>
                            <span className="block text-zinc-700">{m.question}</span>
                            <span className="text-xs text-zinc-500">
                              Yours: {m.your_answer} · Correct: {m.correct_answer}
                            </span>
                            {m.explanation && (
                              <span className="block text-zinc-600 mt-1">
                                {m.explanation}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
