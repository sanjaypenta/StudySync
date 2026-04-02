import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function StudyRoomJoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.replace(/\D/g, "").slice(0, 6);
    const name = username.trim();
    if (trimmed.length !== 6) {
      setError("Enter a valid 6-digit room code.");
      return;
    }
    if (!name) {
      setError("Enter your name.");
      return;
    }
    navigate(`/study-room/${trimmed}`, { state: { username: name } });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)",
      padding: "2.5rem 1rem",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Background orbs */}
      <div style={{
        position: "absolute", top: "-10rem", right: "-8rem",
        width: "38rem", height: "38rem",
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-8rem", left: "-8rem",
        width: "35rem", height: "35rem",
        background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "28rem", position: "relative", zIndex: 1 }}>
        {/* Back link */}
        <Link to="/" style={{
          display: "block",
          fontSize: "0.85rem", color: "rgba(167,139,250,0.8)",
          textDecoration: "none", fontWeight: 500,
          transition: "color 0.2s", marginBottom: "1.5rem",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(167,139,250,0.8)")}
        >
          ← Dashboard
        </Link>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1.5rem",
          padding: "2.25rem",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{
              width: "4rem", height: "4rem",
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.3))",
              border: "1px solid rgba(139,92,246,0.4)",
              borderRadius: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.75rem", margin: "0 auto 1rem",
            }}>
              🔑
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 0.4rem" }}>
              Join a Room
            </h1>
            <p style={{ color: "rgba(148,163,184,0.8)", fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
              Enter the 6-digit code from your host and your display name.
            </p>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Room Code */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
                ROOM CODE
              </label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.875rem", padding: "1rem 1.1rem",
                  color: "#f1f5f9", fontSize: "1.6rem", fontFamily: "monospace",
                  fontWeight: 700, letterSpacing: "0.4em", textAlign: "center",
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
              {/* Code digit indicators */}
              <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.5rem" }}>
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    width: "0.6rem", height: "0.25rem", borderRadius: "0.125rem",
                    background: i < code.length ? "#8b5cf6" : "rgba(255,255,255,0.1)",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
                YOUR NAME
              </label>
              <input
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.875rem", padding: "0.8rem 1rem",
                  color: "#f1f5f9", fontSize: "0.95rem", outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Sam"
                onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "0.65rem", padding: "0.7rem 1rem",
                color: "#fca5a5", fontSize: "0.85rem",
              }} role="alert">
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              style={{
                width: "100%", padding: "0.9rem",
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                border: "none", borderRadius: "0.875rem",
                color: "#fff", fontSize: "0.95rem", fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.02em",
                boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              🚪 Join Room
            </button>
          </form>
        </div>

        {/* Create option */}
        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "rgba(148,163,184,0.6)" }}>
          Don't have a room?{" "}
          <Link to="/study-room/create" style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  );
}
