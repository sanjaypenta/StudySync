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
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <Link
          to="/"
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">
          Create study room
        </h1>
        <p className="mt-2 text-zinc-600 text-sm">
          Set a topic or upload a PDF. You will get a 6-digit code for others
          to join.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Your name
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Topic / notes
            </label>
            <textarea
              className="mt-1 w-full min-h-[100px] rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should the quiz cover?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              PDF (optional)
            </label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="mt-1 w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Number of questions (1–30)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={questionsCount}
              onChange={(e) =>
                setQuestionsCount(Number.parseInt(e.target.value, 10) || 1)
              }
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 text-white py-3 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create room"}
          </button>
        </form>
      </div>
    </div>
  );
}
