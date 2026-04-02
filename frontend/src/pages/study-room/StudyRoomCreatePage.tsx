import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function StudyRoomCreatePage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [questionsCount, setQuestionsCount] = useState(5);
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = displayName.trim() || "Host";
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("topic", topic.trim());
      fd.append("questionsCount", String(questionsCount));
      if (file) fd.append("pdf", file);
      const res = await fetch("/api/study-rooms", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        roomId?: string;
        hostKey?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create room");
        return;
      }
      if (!data.roomId || !data.hostKey) {
        setError("Invalid response from server");
        return;
      }
      sessionStorage.setItem(`studyRoom_hostKey_${data.roomId}`, data.hostKey);
      navigate(`/study-room/${data.roomId}`, {
        state: { username: name },
      });
    } catch {
      setError("Network error — is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)",
      padding: "2.5rem 1rem",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background orbs */}
      <div style={{
        position: "absolute", top: "-10rem", left: "-10rem",
        width: "40rem", height: "40rem",
        background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-8rem", right: "-8rem",
        width: "35rem", height: "35rem",
        background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      <div style={{ maxWidth: "36rem", margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Back link */}
        <Link to="/" style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          fontSize: "0.85rem", color: "rgba(167,139,250,0.8)",
          textDecoration: "none", fontWeight: 500,
          transition: "color 0.2s",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(167,139,250,0.8)")}
        >
          ← Dashboard
        </Link>

        {/* Header */}
        <div style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.6rem",
            background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: "2rem", padding: "0.3rem 0.9rem", marginBottom: "1rem",
          }}>
            <span style={{ fontSize: "1rem" }}>🏟️</span>
            <span style={{ fontSize: "0.78rem", color: "#a78bfa", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Group Arena</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#f1f5f9", margin: 0, lineHeight: 1.2 }}>
            Create a Study Room
          </h1>
          <p style={{ marginTop: "0.6rem", color: "rgba(148,163,184,0.9)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Set a topic or upload a PDF. You'll get a 6-digit code to share with others.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={onSubmit} style={{ marginTop: "2rem" }}>
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "1.25rem",
            padding: "1.75rem",
            backdropFilter: "blur(12px)",
            display: "flex", flexDirection: "column", gap: "1.4rem",
          }}>

            {/* Your Name */}
            <div>
              <label style={{ display: "block", fontSize: "0.83rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.5rem", letterSpacing: "0.03em" }}>
                YOUR NAME
              </label>
              <input
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem", padding: "0.75rem 1rem",
                  color: "#f1f5f9", fontSize: "0.95rem", outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Topic */}
            <div>
              <label style={{ display: "block", fontSize: "0.83rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.5rem", letterSpacing: "0.03em" }}>
                TOPIC / NOTES
              </label>
              <textarea
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem", padding: "0.75rem 1rem",
                  color: "#f1f5f9", fontSize: "0.95rem", outline: "none",
                  minHeight: "110px", resize: "vertical",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What should the quiz cover?"
                onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* PDF Upload */}
            <div>
              <label style={{ display: "block", fontSize: "0.83rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.5rem", letterSpacing: "0.03em" }}>
                PDF <span style={{ color: "rgba(148,163,184,0.6)", fontWeight: 400, fontSize: "0.78rem" }}>(optional)</span>
              </label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type === "application/pdf") setFile(f); }}
                onClick={() => document.getElementById("pdf-upload-create")?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "rgba(139,92,246,0.7)" : file ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.12)"}`,
                  borderRadius: "0.75rem",
                  padding: "1.2rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "rgba(139,92,246,0.08)" : file ? "rgba(139,92,246,0.05)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{file ? "📄" : "📁"}</div>
                <p style={{ color: file ? "#a78bfa" : "rgba(148,163,184,0.7)", fontSize: "0.85rem", margin: 0 }}>
                  {file ? file.name : "Drop a PDF here or click to browse"}
                </p>
                {file && (
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                    style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "rgba(248,113,113,0.8)", background: "none", border: "none", cursor: "pointer" }}>
                    Remove
                  </button>
                )}
              </div>
              <input id="pdf-upload-create" type="file" accept="application/pdf,.pdf" style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>

            {/* Questions Count */}
            <div>
              <label style={{ display: "block", fontSize: "0.83rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.5rem", letterSpacing: "0.03em" }}>
                NUMBER OF QUESTIONS <span style={{ color: "rgba(148,163,184,0.6)", fontWeight: 400 }}>(1–30)</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <input
                  type="range" min={1} max={30} value={questionsCount}
                  onChange={(e) => setQuestionsCount(Number.parseInt(e.target.value, 10))}
                  style={{ flex: 1, accentColor: "#8b5cf6", height: "4px", cursor: "pointer" }}
                />
                <span style={{
                  minWidth: "2.8rem", textAlign: "center",
                  background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)",
                  borderRadius: "0.5rem", padding: "0.25rem 0.6rem",
                  color: "#a78bfa", fontWeight: 700, fontSize: "0.95rem",
                }}>
                  {questionsCount}
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "0.65rem", padding: "0.75rem 1rem",
                color: "#fca5a5", fontSize: "0.85rem",
              }} role="alert">
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "0.9rem",
                background: loading ? "rgba(139,92,246,0.4)" : "linear-gradient(135deg, #7c3aed, #6366f1)",
                border: "none", borderRadius: "0.875rem",
                color: "#fff", fontSize: "0.95rem", fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.2s, transform 0.1s",
                letterSpacing: "0.02em",
                boxShadow: loading ? "none" : "0 4px 20px rgba(124,58,237,0.4)",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              {loading ? "Creating room…" : "🚀 Create Room"}
            </button>
          </div>
        </form>

        {/* Join option */}
        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "rgba(148,163,184,0.6)" }}>
          Have a code?{" "}
          <Link to="/study-room/join" style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>
            Join an existing room →
          </Link>
        </p>
      </div>
    </div>
  );
}
