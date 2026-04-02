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
  const pct = Math.min(100, (sec / 30) * 100);
  const color = sec <= 5 ? "#ef4444" : sec <= 10 ? "#f59e0b" : "#8b5cf6";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ position: "relative", width: "3rem", height: "3rem" }}>
        <svg width="48" height="48" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.3s, stroke 0.3s" }}
          />
        </svg>
        <span style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.75rem", fontWeight: 700, color, fontFamily: "monospace",
        }}>
          {sec}
        </span>
      </div>
    </div>
  );
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const darkStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)",
  padding: "2rem 1rem",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  position: "relative",
  overflow: "hidden",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "1.25rem",
  backdropFilter: "blur(12px)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "0.75rem", padding: "0.75rem 1rem",
  color: "#f1f5f9", fontSize: "0.95rem", outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

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

  // ── Invalid room ────────────────────────────────────────────────────
  if (!roomId || !/^\d{6}$/.test(roomId)) {
    return (
      <div style={{ ...darkStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😕</div>
          <p style={{ color: "#94a3b8", fontSize: "1rem", marginBottom: "1rem" }}>Invalid room code.</p>
          <Link to="/study-room/join" style={{
            display: "inline-block", padding: "0.6rem 1.4rem",
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            color: "#fff", borderRadius: "0.75rem", textDecoration: "none",
            fontWeight: 600, fontSize: "0.9rem",
          }}>
            Join a Room
          </Link>
        </div>
      </div>
    );
  }

  // ── Name entry ───────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div style={{ ...darkStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          position: "absolute", top: "-10rem", left: "-10rem", width: "40rem", height: "40rem",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ width: "100%", maxWidth: "26rem", position: "relative", zIndex: 1 }}>
          <Link to="/" style={{ display: "block", fontSize: "0.85rem", color: "rgba(167,139,250,0.8)", textDecoration: "none", marginBottom: "1.5rem", fontWeight: 500 }}>
            ← Dashboard
          </Link>
          <div style={{ ...cardStyle, padding: "2.25rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🚪</div>
              <h1 style={{ color: "#f1f5f9", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.3rem" }}>
                Room <span style={{ fontFamily: "monospace", color: "#a78bfa" }}>{roomLabel}</span>
              </h1>
              <p style={{ color: "rgba(148,163,184,0.8)", fontSize: "0.88rem", margin: 0 }}>
                Enter the name others will see in the lobby.
              </p>
            </div>
            <form onSubmit={enterRoom} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input
                style={inputStyle}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Your name"
                autoFocus
                onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
              <button type="submit" style={{
                width: "100%", padding: "0.85rem",
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                border: "none", borderRadius: "0.875rem",
                color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
              }}>
                Enter Lobby →
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Main room ────────────────────────────────────────────────────────
  return (
    <div style={darkStyle}>
      {/* BG orbs */}
      <div style={{
        position: "absolute", top: "-10rem", left: "-10rem", width: "40rem", height: "40rem",
        background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-8rem", right: "-8rem", width: "35rem", height: "35rem",
        background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      <div style={{ maxWidth: "42rem", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <Link to="/" style={{ fontSize: "0.85rem", color: "rgba(167,139,250,0.8)", textDecoration: "none", fontWeight: 500 }}>
            ← Dashboard
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem", padding: "0.4rem 0.9rem",
            }}>
              <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Room</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#a78bfa", fontSize: "1rem", letterSpacing: "0.08em" }}>{roomLabel}</span>
            </div>
            <div style={{
              width: "0.6rem", height: "0.6rem", borderRadius: "50%",
              background: connected ? "#22c55e" : "#f59e0b",
              boxShadow: connected ? "0 0 8px #22c55e" : "0 0 8px #f59e0b",
            }} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "0.75rem", padding: "0.75rem 1rem",
            color: "#fca5a5", fontSize: "0.85rem", marginBottom: "1rem",
          }} role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* ── LOBBY ─────────────────────────────────────────────── */}
        {phase === "lobby" && (
          <div style={{ ...cardStyle, padding: "2rem" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{
                width: "2.75rem", height: "2.75rem",
                background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.3))",
                border: "1px solid rgba(139,92,246,0.4)", borderRadius: "0.75rem",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem",
              }}>🎮</div>
              <div>
                <h2 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "1.2rem", margin: 0 }}>Lobby</h2>
                <p style={{ color: "rgba(148,163,184,0.7)", fontSize: "0.82rem", margin: 0 }}>
                  Share code <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em" }}>{roomLabel}</span> so friends can join
                </p>
              </div>
            </div>

            {/* Players list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
              {lobbyUsers.length === 0 && (
                <div style={{
                  textAlign: "center", padding: "1.5rem",
                  color: "rgba(148,163,184,0.5)", fontSize: "0.88rem",
                }}>
                  Waiting for players to join…
                </div>
              )}
              {lobbyUsers.map((u, i) => (
                <div key={u.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "0.75rem", padding: "0.75rem 1rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "2rem", height: "2rem", borderRadius: "50%",
                      background: `hsl(${(i * 60 + 200) % 360}, 60%, 40%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.85rem", fontWeight: 700, color: "#fff",
                    }}>
                      {u.displayName[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span style={{ color: "#e2e8f0", fontWeight: 500, fontSize: "0.95rem" }}>{u.displayName}</span>
                  </div>
                  {u.isHost && (
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700, color: "#fbbf24",
                      background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)",
                      borderRadius: "0.5rem", padding: "0.2rem 0.6rem", letterSpacing: "0.04em",
                    }}>
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                type="button"
                onClick={() => startQuiz()}
                disabled={!connected || lobbyUsers.length < 1}
                style={{
                  width: "100%", padding: "0.9rem",
                  background: !connected || lobbyUsers.length < 1
                    ? "rgba(139,92,246,0.3)"
                    : "linear-gradient(135deg, #7c3aed, #6366f1)",
                  border: "none", borderRadius: "0.875rem",
                  color: "#fff", fontSize: "0.95rem", fontWeight: 700,
                  cursor: !connected || lobbyUsers.length < 1 ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                  transition: "opacity 0.2s",
                  opacity: !connected || lobbyUsers.length < 1 ? 0.5 : 1,
                }}
              >
                ▶ Start Quiz
              </button>
            ) : (
              <div style={{
                textAlign: "center", padding: "1rem",
                background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: "0.75rem",
              }}>
                <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>⏳</div>
                <p style={{ color: "rgba(148,163,184,0.8)", fontSize: "0.88rem", margin: 0 }}>
                  Waiting for the host to start the quiz…
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── QUIZ ──────────────────────────────────────────────── */}
        {phase === "quiz" && currentQuestion && (
          <div style={{ ...cardStyle, padding: "2rem" }}>
            {/* Progress header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" }}>
              <div>
                <p style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 0.2rem", textTransform: "uppercase" }}>
                  Question {currentQuestion.index + 1} / {currentQuestion.total}
                </p>
                {/* Progress bar */}
                <div style={{ width: "12rem", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    background: "linear-gradient(90deg, #7c3aed, #6366f1)",
                    width: `${((currentQuestion.index + 1) / currentQuestion.total) * 100}%`,
                    transition: "width 0.4s",
                  }} />
                </div>
              </div>
              <Countdown endsAt={currentQuestion.endsAt} />
            </div>

            {/* Question */}
            <h2 style={{
              color: "#f1f5f9", fontSize: "1.15rem", fontWeight: 600,
              lineHeight: 1.5, margin: "1.25rem 0 1.5rem",
            }}>
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {currentQuestion.options.map((opt, idx) => {
                const letters = ["A", "B", "C", "D"];
                const picked = selectedOption === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedOption(opt)}
                    style={{
                      textAlign: "left", padding: "1rem",
                      background: picked ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${picked ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: "0.875rem",
                      color: picked ? "#c4b5fd" : "#cbd5e1",
                      fontSize: "0.9rem", cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: picked ? "0 0 0 3px rgba(139,92,246,0.15)" : "none",
                      display: "flex", alignItems: "flex-start", gap: "0.75rem",
                    }}
                    onMouseEnter={e => { if (!picked) { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; } }}
                    onMouseLeave={e => { if (!picked) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; } }}
                  >
                    <span style={{
                      minWidth: "1.5rem", height: "1.5rem", borderRadius: "0.375rem",
                      background: picked ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.72rem", fontWeight: 700,
                      color: picked ? "#e9d5ff" : "#94a3b8",
                    }}>
                      {letters[idx] ?? idx + 1}
                    </span>
                    <span style={{ lineHeight: 1.45 }}>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setSelectedOption(null)}
                style={{
                  flex: 1, padding: "0.75rem",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem", color: "#94a3b8", fontSize: "0.9rem",
                  fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => submitAnswer(selectedOption ?? "")}
                style={{
                  flex: 2, padding: "0.75rem",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  border: "none", borderRadius: "0.75rem",
                  color: "#fff", fontSize: "0.9rem", fontWeight: 700,
                  cursor: "pointer", boxShadow: "0 4px 15px rgba(124,58,237,0.35)",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                Submit & Next →
              </button>
            </div>
            <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "rgba(148,163,184,0.5)", lineHeight: 1.5 }}>
              Clear resets your choice. Next submits and moves you forward; timer auto-submits when it runs out.
            </p>
          </div>
        )}

        {/* ── WAITING ───────────────────────────────────────────── */}
        {phase === "quiz_waiting" && (
          <div style={{
            ...cardStyle, padding: "3rem 2rem", textAlign: "center",
            background: "rgba(251,191,36,0.05)", borderColor: "rgba(251,191,36,0.2)",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <p style={{ color: "#fde68a", fontSize: "1.2rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
              You finished all {totalQuestions} questions!
            </p>
            <p style={{ color: "rgba(253,230,138,0.7)", fontSize: "0.9rem", margin: 0 }}>
              Waiting for everyone else to finish… Results will appear here when the last person is done.
            </p>
            {/* Pulsing dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "1.5rem" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: "0.5rem", height: "0.5rem", borderRadius: "50%",
                  background: "#fbbf24",
                  animation: `pulse ${0.8 + i * 0.2}s ease-in-out infinite alternate`,
                }} />
              ))}
            </div>
            <style>{`@keyframes pulse { from { opacity: 0.3; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }`}</style>
          </div>
        )}

        {/* ── RESULTS ───────────────────────────────────────────── */}
        {phase === "results" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Leaderboard */}
            <div style={{ ...cardStyle, padding: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "1.3rem" }}>🏆</span>
                <h2 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "1.15rem", margin: 0 }}>Leaderboard</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {leaderboard.map((row) => (
                  <div key={row.userId} style={{
                    display: "flex", alignItems: "center", gap: "0.85rem",
                    background: row.isTop ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${row.isTop ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "0.875rem", padding: "0.85rem 1rem",
                  }}>
                    <span style={{ fontSize: "1.3rem", minWidth: "2rem", textAlign: "center" }}>
                      {RANK_MEDALS[row.rank - 1] ?? `#${row.rank}`}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: row.isTop ? "#fde68a" : "#e2e8f0", fontWeight: 600, margin: 0, fontSize: "0.95rem" }}>
                        {row.displayName}
                        {row.isTop && <span style={{ marginLeft: "0.4rem" }}>👑</span>}
                      </p>
                      <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.78rem", margin: 0 }}>
                        {(row.totalMs / 1000).toFixed(1)}s total
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        fontSize: "1.1rem", fontWeight: 800,
                        color: row.isTop ? "#fbbf24" : "#a78bfa",
                        fontFamily: "monospace",
                      }}>
                        {row.score}
                      </span>
                      <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.72rem", margin: 0 }}>pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div style={{ ...cardStyle, padding: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "1.3rem" }}>💡</span>
                <h2 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "1.15rem", margin: 0 }}>
                  Your Feedback
                </h2>
              </div>

              {!feedback && (
                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                  <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>⚙️</div>
                  <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.9rem", margin: 0 }}>
                    Generating personalized feedback…
                  </p>
                </div>
              )}

              {feedback && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Score */}
                  <div style={{
                    background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: "0.875rem", padding: "1rem 1.1rem",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                  }}>
                    <span style={{ fontSize: "1.4rem" }}>🎯</span>
                    <div>
                      <p style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 0.15rem", textTransform: "uppercase" }}>Score</p>
                      <p style={{ color: "#c4b5fd", fontWeight: 600, margin: 0, fontSize: "0.95rem" }}>{feedback.score}</p>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div style={{
                    background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: "0.875rem", padding: "1rem 1.1rem",
                  }}>
                    <p style={{ color: "#86efac", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 0.4rem", textTransform: "uppercase" }}>✅ Strengths</p>
                    <p style={{ color: "#dcfce7", fontSize: "0.9rem", margin: 0, lineHeight: 1.55 }}>{feedback.strengths}</p>
                  </div>

                  {/* Growth areas */}
                  <div style={{
                    background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)",
                    borderRadius: "0.875rem", padding: "1rem 1.1rem",
                  }}>
                    <p style={{ color: "#fde68a", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 0.4rem", textTransform: "uppercase" }}>📈 Growth Areas</p>
                    <p style={{ color: "#fef9c3", fontSize: "0.9rem", margin: 0, lineHeight: 1.55 }}>{feedback.weakness}</p>
                  </div>

                  {/* Tips */}
                  <div style={{
                    background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: "0.875rem", padding: "1rem 1.1rem",
                  }}>
                    <p style={{ color: "#93c5fd", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 0.4rem", textTransform: "uppercase" }}>💬 Tips</p>
                    <p style={{ color: "#dbeafe", fontSize: "0.9rem", margin: 0, lineHeight: 1.55 }}>{feedback.tips}</p>
                  </div>

                  {/* Mistakes */}
                  {feedback.mistakes.length > 0 && (
                    <div style={{
                      background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: "0.875rem", padding: "1rem 1.1rem",
                    }}>
                      <p style={{ color: "#fca5a5", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", margin: "0 0 0.75rem", textTransform: "uppercase" }}>
                        ❌ Mistakes to Review
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        {feedback.mistakes.map((m, i) => (
                          <div key={i} style={{
                            background: "rgba(239,68,68,0.05)", borderRadius: "0.625rem",
                            padding: "0.75rem 0.9rem",
                          }}>
                            <p style={{ color: "#fecaca", fontWeight: 600, margin: "0 0 0.4rem", fontSize: "0.9rem" }}>{m.question}</p>
                            <p style={{ color: "rgba(252,165,165,0.7)", fontSize: "0.8rem", margin: "0 0 0.35rem" }}>
                              Yours: <span style={{ color: "#fca5a5" }}>{m.your_answer}</span>
                              {" · "}
                              Correct: <span style={{ color: "#86efac" }}>{m.correct_answer}</span>
                            </p>
                            {m.explanation && (
                              <p style={{ color: "rgba(252,165,165,0.65)", fontSize: "0.82rem", margin: 0, lineHeight: 1.5 }}>{m.explanation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Play again */}
            <Link to="/study-room/create" style={{
              display: "block", textAlign: "center", padding: "0.9rem",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              color: "#fff", textDecoration: "none", borderRadius: "0.875rem",
              fontWeight: 700, fontSize: "0.95rem",
              boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
            }}>
              🔄 New Room
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
