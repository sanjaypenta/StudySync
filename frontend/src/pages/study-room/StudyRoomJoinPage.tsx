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
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <Link
          to="/"
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">
          Join study room
        </h1>
        <p className="mt-2 text-zinc-600 text-sm">
          Enter the 6-digit code from your host and your display name.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Room code
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm tracking-widest font-mono"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Your name
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Sam"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 text-white py-3 text-sm font-medium hover:bg-zinc-800"
          >
            Join room
          </button>
        </form>
      </div>
    </div>
  );
}
