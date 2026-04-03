import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  authHeaders,
  fetchBuddyConnections,
  searchBuddyByCode,
  sendBuddyRequest,
  acceptBuddyRequest,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────

type Tab = "chat" | "discover";

type Connection = {
  id: string;
  buddyId: string;
  status: "pending" | "accepted" | "rejected";
  isIncomingRequest: boolean;
};

type BuddyRec = {
  userId: string;
  matchScore: number;
  matchReason: string;
  theyCanHelpYouWith: string[];
  youCanHelpThemWith: string[];
};

type SearchResult = {
  userId: string;
  companionType: string | null;
  streak: number;
};

// ── Helpers ────────────────────────────────────────────────

function avatarLetter(uid: string) {
  return uid.substring(0, 2).toUpperCase();
}

// ── Main Page ──────────────────────────────────────────────

export function BuddyArenaPage() {
  const { user } = useAuth();
  const myId = (user as any)?.id ?? (user as any)?._id ?? "";

  const [tab, setTab] = useState<Tab>("discover");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [recs, setRecs] = useState<BuddyRec[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // load connections on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBuddyConnections();
        setConnections(data.connections as Connection[]);
      } catch { /* offline */ }
    })();
  }, []);

  // load recommendations
  useEffect(() => {
    if (tab !== "discover") return;
    (async () => {
      try {
        const res = await fetch("/api/buddies/recommend", { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) { setRecsError(data.error || "Enable buddy search in Profile first."); }
        else setRecs(data.recommendations ?? []);
      } catch { setRecsError("Could not load recommendations."); }
      setRecsLoading(false);
    })();
  }, [tab]);

  async function handleSearch() {
    if (!searchQ.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const data = await searchBuddyByCode(searchQ.trim());
      setSearchResults(data.results);
      if (data.results.length === 0) showToast("No user found with that code.");
    } catch { showToast("Search failed."); }
    setSearching(false);
  }

  async function handleSendRequest(targetId: string) {
    setRequestingId(targetId);
    try {
      const result = await sendBuddyRequest(targetId);
      showToast(result.status === "accepted" ? "🎉 Now connected!" : "✅ Request sent!");
      const data = await fetchBuddyConnections();
      setConnections(data.connections as Connection[]);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to send request.");
    }
    setRequestingId(null);
  }

  async function handleAccept(targetId: string) {
    try {
      await acceptBuddyRequest(targetId);
      showToast("🎉 Connected!");
      const data = await fetchBuddyConnections();
      setConnections(data.connections as Connection[]);
    } catch { showToast("Failed to accept."); }
  }

  const accepted = connections.filter(c => c.status === "accepted");
  const incoming = connections.filter(c => c.isIncomingRequest);

  return (
    <div className="relative min-h-screen" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-gradient-to-tr from-cyan-600/15 to-transparent blur-3xl" />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-violet-400/30 bg-zinc-900/95 px-5 py-2.5 text-sm font-semibold text-violet-100 shadow-xl backdrop-blur"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Split: Chat list + active chat OR discover ── */}
      <div className="flex h-full gap-0">

        {/* LEFT PANEL */}
        <div className="w-full max-w-xs shrink-0 flex flex-col border-r border-white/5 bg-zinc-950/70 min-h-[calc(100vh-64px)]">

          {/* Header + tabs */}
          <div className="p-4 pb-0">
            <h1 className="text-lg font-black text-white tracking-tight">Study Buddies</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">Connect. Learn. Level up together.</p>
            <div className="mt-4 flex gap-1 rounded-xl bg-zinc-900 p-1">
              {(["discover","chat"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition-all ${tab === t ? "bg-violet-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  {t === "chat" ? `💬 Learning Buddies${accepted.length > 0 ? ` (${accepted.length})` : ""}` : "🔍 Discover"}
                </button>
              ))}
            </div>
          </div>

          {/* Pixelated search bar */}
          <div className="px-4 mt-4">
            <div
              className="flex items-center gap-2 rounded-none border-2 border-fuchsia-500/60 bg-black px-3 py-2"
              style={{
                boxShadow: "3px 3px 0px #7c3aed, inset 1px 1px 0px rgba(255,255,255,0.05)",
                imageRendering: "pixelated",
              }}
            >
              <span className="text-fuchsia-400 text-sm" style={{ fontFamily: "monospace", letterSpacing: "-1px" }}>▶</span>
              <input
                className="flex-1 bg-transparent text-xs font-mono text-white outline-none placeholder:text-fuchsia-500/60"
                placeholder="ENTER BUDDY CODE..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                style={{ letterSpacing: "0.05em" }}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="rounded-none bg-fuchsia-600 px-2 py-0.5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-fuchsia-500 transition-colors disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0px #4c1d95" }}
              >
                {searching ? "…" : "GO"}
              </button>
            </div>
            {/* Search results */}
            <AnimatePresence>
              {searchResults.map(r => (
                <motion.div
                  key={r.userId}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-3 flex items-center gap-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-fuchsia-600/30 border border-fuchsia-500/50 flex items-center justify-center text-xs font-black text-fuchsia-200">
                    {avatarLetter(r.userId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">ID: {r.userId.slice(0, 12)}…</p>
                    <p className="text-[10px] text-fuchsia-300">🔥 {r.streak} day streak</p>
                  </div>
                  <button
                    onClick={() => handleSendRequest(r.userId)}
                    disabled={requestingId === r.userId}
                    className="shrink-0 rounded-lg bg-fuchsia-600/80 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-fuchsia-500 transition-colors disabled:opacity-50"
                  >
                    {requestingId === r.userId ? "…" : "Connect"}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Incoming requests */}
          {incoming.length > 0 && (
            <div className="px-4 mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 mb-2">Pending Requests</p>
              {incoming.map(c => (
                <div key={c.id} className="mb-2 rounded-xl border border-amber-500/25 bg-amber-950/20 p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-xs font-black text-amber-200">
                    {avatarLetter(c.buddyId)}
                  </div>
                  <p className="flex-1 text-xs text-amber-100 truncate">{c.buddyId.slice(0, 14)}…</p>
                  <button onClick={() => handleAccept(c.buddyId)} className="rounded-lg bg-emerald-600/80 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-500">
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Buddy list (chat mode) */}
          {tab === "chat" && (
            <div className="flex-1 overflow-y-auto mt-4 px-2">
              {accepted.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-zinc-500">
                  No learning buddies yet.<br />Switch to Discover to find matches!
                </div>
              ) : (
                accepted.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChatId(c.buddyId)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 mb-1 transition-all text-left ${activeChatId === c.buddyId ? "bg-violet-600/20 border border-violet-400/30" : "hover:bg-white/5"}`}
                  >
                    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-sm font-black text-white">
                      {avatarLetter(c.buddyId)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">Buddy #{c.buddyId.slice(-4)}</p>
                      <p className="text-[11px] text-zinc-500">Tap to chat</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Discover list */}
          {tab === "discover" && (
            <div className="flex-1 overflow-y-auto mt-4 px-2">
              {recsLoading ? (
                <div className="space-y-3 px-2">
                  {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-violet-950/30" />)}
                </div>
              ) : recsError ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-rose-300 leading-relaxed">{recsError}</p>
                  <a href="/profile" className="mt-2 inline-block text-[10px] text-fuchsia-400 underline">Enable in Profile →</a>
                </div>
              ) : recs.length === 0 ? (
                <p className="px-4 text-xs text-zinc-500 text-center mt-6">No AI matches yet. Complete more tasks to build your subject profile!</p>
              ) : (
                recs.map(rec => <DiscoverCard key={rec.userId} rec={rec} onRequest={handleSendRequest} requestingId={requestingId} />)
              )}
            </div>
          )}

        </div>

        {/* RIGHT PANEL: Chat or empty state */}
        <div className="flex-1 flex flex-col bg-zinc-950/40 min-h-[calc(100vh-64px)]">
          {tab === "chat" && activeChatId ? (
            <ChatPanel myId={myId} buddyId={activeChatId} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10">
              <div className="text-6xl animate-bounce">🤝</div>
              <h2 className="text-2xl font-black text-white">
                {tab === "discover" ? "Find Your Study Soulmate" : "Select a Buddy to Chat"}
              </h2>
              <p className="text-sm text-zinc-400 max-w-xs">
                {tab === "discover"
                  ? "Browse AI-recommended matches on the left, or enter a Buddy Code to connect directly."
                  : "Click a learning buddy on the left to open your chat!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Discover Card ──────────────────────────────────────────

function DiscoverCard({ rec, onRequest, requestingId }: { rec: BuddyRec; onRequest: (id: string) => void; requestingId: string | null }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="mb-2 rounded-xl border border-violet-500/20 bg-zinc-900/60 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/3 transition-colors"
      >
        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-violet-700 to-fuchsia-600 flex items-center justify-center text-sm font-black text-white">
          {avatarLetter(rec.userId)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-white truncate">Buddy #{rec.userId.slice(-4)}</p>
            <span className="shrink-0 text-[10px] font-black text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/30 px-1.5 rounded">
              {rec.matchScore}%
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 truncate">{rec.matchReason}</p>
        </div>
        <span className="text-zinc-600 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-3">
              {rec.theyCanHelpYouWith.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/80 mb-1">They help you with</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.theyCanHelpYouWith.map(s => (
                      <span key={s} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {rec.youCanHelpThemWith.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-fuchsia-400/80 mb-1">You help them with</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.youCanHelpThemWith.map(s => (
                      <span key={s} className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] text-fuchsia-200">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => onRequest(rec.userId)}
                disabled={requestingId === rec.userId}
                className="w-full mt-2 rounded-lg bg-violet-600 py-2 text-xs font-bold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {requestingId === rec.userId ? "Sending…" : "Send Connection Request"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Chat Panel (MongoDB-backed) ────────────────────────────

function ChatPanel({ myId, buddyId }: { myId: string; buddyId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Poll every 2 seconds — both users see each other's messages */
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/buddies/chat/${buddyId}`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setMessages(data.messages ?? []);
      } catch { /* network blip — ignore */ }
    }
    void poll();
    const id = window.setInterval(() => void poll(), 2000);
    return () => { active = false; window.clearInterval(id); };
  }, [buddyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch(`/api/buddies/chat/${buddyId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
    } catch { /* show nothing — poll will retry */ }
    setSending(false);
  }

  const formatTime = (ts: string | Date) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-zinc-950/60 px-5 py-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-sm font-black text-white">
          {avatarLetter(buddyId)}
        </div>
        <div>
          <p className="text-sm font-bold text-white">Buddy #{buddyId.slice(-6)}</p>
          <p className="text-[10px] text-emerald-400">● Learning Buddy</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-xs text-zinc-500 mt-8">
            Say hi to your new study buddy! 👋
          </div>
        )}
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === myId;
          return (
            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMe ? "bg-violet-600 text-white rounded-br-sm" : "bg-zinc-800 text-zinc-100 rounded-bl-sm"}`}>
                <p className="leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-violet-200/70 text-right" : "text-zinc-500"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-white/5 bg-zinc-950/70 px-4 py-3 flex items-center gap-3">
        <input
          className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500 placeholder:text-zinc-500 transition-colors"
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && void send()}
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          className="h-10 w-10 shrink-0 rounded-full bg-violet-600 flex items-center justify-center text-white hover:bg-violet-500 transition-colors disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 rotate-45">
            <path d="M2 21L23 12 2 3v7l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

