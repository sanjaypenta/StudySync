import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  authHeaders,
  fetchBuddyConnections,
  sendBuddyRequest,
  acceptBuddyRequest,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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

function avatarLetter(uid: string) {
  return uid.substring(0, 2).toUpperCase();
}

// ── Main Page ──────────────────────────────────────────────

export function BuddyArenaPage() {
  const { user } = useAuth();
  const myId = (user as any)?.id ?? (user as any)?._id ?? "";

  const [connections, setConnections] = useState<Connection[]>([]);
  const [friendFilter, setFriendFilter] = useState("");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showMailbox, setShowMailbox] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<BuddyRec | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBuddyConnections();
        setConnections(data.connections as Connection[]);
      } catch {}
    })();
  }, []);

  async function handleSendRequest(targetId: string) {
    setRequestingId(targetId);
    try {
      const result = await sendBuddyRequest(targetId);
      showToast(result.status === "accepted" ? "🎉 Now connected!" : "✅ Request sent!");
      const data = await fetchBuddyConnections();
      setConnections(data.connections as Connection[]);
      setSelectedProfile(null);
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
  const outgoing = connections.filter(c => !c.isIncomingRequest && c.status === "pending");
  const mailboxCount = incoming.length + outgoing.length;

  const filteredFriends = useMemo(() => {
    if (!friendFilter.trim()) return accepted;
    return accepted.filter(c => c.buddyId.toLowerCase().includes(friendFilter.toLowerCase()));
  }, [accepted, friendFilter]);

  return (
    <div className="relative h-screen flex flex-col bg-zinc-950" style={{ fontFamily: "Space Grotesk, sans-serif" }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 z-[60] -translate-x-1/2 rounded-2xl border border-violet-400/30 bg-zinc-900/95 px-5 py-2.5 text-sm font-semibold text-violet-100 shadow-xl backdrop-blur"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mailbox Modal */}
      <AnimatePresence>
        {showMailbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowMailbox(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setShowMailbox(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">✕</button>
              <h3 className="text-lg font-black text-white mb-1">📬 Mailbox</h3>
              <p className="text-xs text-zinc-500 mb-5">Friend requests &amp; connection status</p>

              {incoming.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">Incoming Requests ({incoming.length})</p>
                  <div className="space-y-2">
                    {incoming.map(c => (
                      <div key={c.id} className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-3 flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-sm font-black text-amber-200">
                          {avatarLetter(c.buddyId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-amber-100 truncate">#{c.buddyId.slice(-8)}</p>
                          <p className="text-[10px] text-amber-500/80">Wants to be your buddy</p>
                        </div>
                        <button onClick={() => handleAccept(c.buddyId)} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow transition-colors">
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">Sent Requests ({outgoing.length})</p>
                  <div className="space-y-2">
                    {outgoing.map(c => (
                      <div key={c.id} className="rounded-xl border border-violet-500/20 bg-violet-950/15 p-3 flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-sm font-black text-violet-200">
                          {avatarLetter(c.buddyId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-violet-100 truncate">#{c.buddyId.slice(-8)}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incoming.length === 0 && outgoing.length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm text-zinc-500">No pending requests.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Detail Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <ProfileDetailModal
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onSendRequest={handleSendRequest}
            requestingId={requestingId}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-1 h-full overflow-hidden">
        {/* LEFT PANEL (WhatsApp-style friends list) */}
        <div className="w-full max-w-xs shrink-0 flex flex-col border-r border-white/5 bg-zinc-950 min-h-0 z-10 shadow-lg">
          <div className="p-4 border-b border-white/5 bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-black text-white tracking-tight">Buddy Arena</h1>
              {activeChatId && (
                <button onClick={() => setActiveChatId(null)} className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">
                  ← Discover
                </button>
              )}
            </div>
          </div>

          <div className="p-3">
            <input
              type="text"
              placeholder="Search your buddies..."
              value={friendFilter}
              onChange={e => setFriendFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 pt-1 space-y-1 custom-scroll">
            {filteredFriends.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-zinc-500">
                {friendFilter ? "No buddies match that search." : "No buddies yet — search by code to connect!"}
              </div>
            ) : (
              filteredFriends.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveChatId(c.buddyId)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-all text-left group ${activeChatId === c.buddyId ? "bg-violet-600/20 border border-violet-500/30" : "hover:bg-white/5 border border-transparent"}`}
                >
                  <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-lg font-black text-white shadow-inner">
                    {avatarLetter(c.buddyId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">Buddy #{c.buddyId.slice(-6)}</p>
                    <p className="text-xs text-zinc-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">Tap to open chat</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col relative bg-[#09090b]">

          {/* Mailbox Button — always visible top-right */}
          <div className="absolute top-4 right-5 z-20">
            <button
              onClick={() => setShowMailbox(true)}
              className="relative rounded-full bg-zinc-800/80 p-2.5 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border border-white/5 backdrop-blur shadow"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {mailboxCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-zinc-950">
                  {mailboxCount}
                </span>
              )}
            </button>
          </div>

          {activeChatId ? (
            <ChatPanel myId={myId} buddyId={activeChatId} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="h-24 w-24 rounded-full bg-zinc-900/80 border border-white/5 flex items-center justify-center text-4xl mb-4 shadow-xl">
                💬
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Buddy Arena</h2>
              <p className="text-sm text-zinc-400 max-w-sm">
                Select a friend from the left to start chatting, or use the global search bar at the top to find new people.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Profile Detail Modal ───────────────────────────────────

function ProfileDetailModal({ profile, onClose, onSendRequest, requestingId }: {
  profile: BuddyRec; onClose: () => void; onSendRequest: (id: string) => void; requestingId: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm rounded-2xl border border-violet-500/30 bg-zinc-900 shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white text-lg transition-colors">✕</button>
        </div>

        <div className="px-6 pb-6 -mt-10 relative">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-2xl font-black text-white shadow-xl border-4 border-zinc-900">
            {avatarLetter(profile.userId)}
          </div>

          <h3 className="mt-4 text-xl font-black text-white">Buddy #{profile.userId.slice(-6)}</h3>
          <p className="text-xs font-mono text-zinc-500 mt-1 break-all">{profile.userId}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 px-3 py-1">
            <span className="text-xs font-bold text-fuchsia-300">{profile.matchScore}% Match</span>
          </div>

          <p className="mt-4 text-sm text-zinc-300 leading-relaxed">{profile.matchReason}</p>

          {profile.theyCanHelpYouWith.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5">They Excel At</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.theyCanHelpYouWith.map(s => (
                  <span key={s} className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">{s}</span>
                ))}
              </div>
            </div>
          )}

          {profile.youCanHelpThemWith.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-1.5">You Can Help With</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.youCanHelpThemWith.map(s => (
                  <span key={s} className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-300">{s}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onSendRequest(profile.userId)}
            disabled={requestingId === profile.userId}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {requestingId === profile.userId ? "Connecting…" : "🤝 Send Friend Request"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Chat Panel (MongoDB-backed) ────────────────────────────

function ChatPanel({ myId, buddyId }: { myId: string; buddyId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/buddies/chat/${buddyId}`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setMessages(data.messages ?? []);
      } catch {}
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
    } catch {}
    setSending(false);
  }

  const formatTime = (ts: string | Date) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-full bg-zinc-950/60 relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5" style={{ backgroundSize: '20px 20px', backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)' }} />

      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/80 backdrop-blur px-6 py-4 z-10 shadow-sm relative pr-24">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-sm font-black text-white shadow-lg">
            {avatarLetter(buddyId)}
          </div>
          <div>
            <p className="text-base font-bold text-white">Buddy #{buddyId.slice(-6)}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-semibold text-emerald-400">Connected</p>
            </div>
          </div>
        </div>
        <button
          className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          title="Share Notes / Files (Coming Soon!)"
          onClick={() => alert("File sharing via Supabase coming in Phase 3!")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 z-10 custom-scroll">
        {messages.length === 0 && (
          <div className="text-center mt-12 bg-zinc-900/70 border border-white/5 backdrop-blur-sm max-w-sm mx-auto p-6 rounded-3xl shadow-xl">
            <div className="text-4xl mb-3">👋</div>
            <h4 className="text-white font-bold mb-1">Send a message</h4>
            <p className="text-zinc-400 text-sm">Say hi to your new learning buddy!</p>
          </div>
        )}
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === myId;
          return (
            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-5 py-3 text-[15px] shadow-sm ${isMe ? "bg-violet-600 text-white rounded-br-sm shadow-violet-900/20" : "bg-zinc-800 text-zinc-100 rounded-bl-sm border border-white/5 shadow-black/40"}`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className={`flex items-center gap-1 mt-1.5 justify-end ${isMe ? "text-violet-200/70" : "text-zinc-500"}`}>
                  <p className="text-[10px] font-medium tracking-wide">{formatTime(msg.created_at)}</p>
                  {isMe && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input bar */}
      <div className="bg-zinc-900/90 backdrop-blur border-t border-white/5 p-4 z-10">
        <div className="flex items-center gap-3 max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/10 rounded-full pl-6 pr-2 py-1.5 transition-all shadow-inner">
          <input
            className="flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && void send()}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md hover:bg-violet-500 transition-colors disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 ml-0.5">
              <path d="M2 21L23 12 2 3v7l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
