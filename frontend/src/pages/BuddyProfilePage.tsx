import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { authHeaders, sendBuddyRequest } from "@/lib/api";

type ProfileData = {
  userId: string;
  syncCode: string;
  matchScore: number;
  matchReason: string;
  theyCanHelpYouWith: string[];
  youCanHelpThemWith: string[];
  streak: number;
  companionType: string | null;
  connectionStatus: "none" | "connected" | "request_sent" | "request_received";
  // New rich fields
  interests: string[];
  learnerSummary: string;
  studyMode: "self" | "group";
  subjectMastery: {
    subject: string;
    currentLevel: number;
  }[];
  weeklyStudyHoursTarget: number;
};

function avatarLetter(uid: string) {
  return uid.substring(0, 2).toUpperCase();
}

export function BuddyProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/buddies/profile/${id}`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) setError(data.error || "Failed to load profile.");
        else setProfile(data);
      } catch {
        setError("Network error loading profile.");
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleSendRequest() {
    if (!profile) return;
    setRequesting(true);
    try {
      const result = await sendBuddyRequest(profile.userId);
      showToast(result.status === "accepted" ? "🎉 Now connected!" : "✅ Request sent!");
      setProfile(p => p ? { ...p, connectionStatus: "request_sent" } : null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to send request.");
    }
    setRequesting(false);
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-4xl mb-4">👻</div>
        <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
        <p className="text-zinc-400 text-sm mb-6">{error || "This user doesn't exist or isn't looking for buddies."}</p>
        <button onClick={() => navigate("/search")} className="rounded-xl bg-zinc-800 px-5 py-2 text-sm text-white hover:bg-zinc-700">Back to Search</button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[80vh] pb-20" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
      
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

      {/* Header Area */}
      <div className="relative h-64 w-full rounded-3xl overflow-hidden mb-12 shadow-2xl border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-fuchsia-900 to-rose-900 opacity-60" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        
        <button 
          onClick={() => navigate("/search")}
          className="absolute top-6 left-6 flex items-center gap-2 rounded-full bg-black/40 backdrop-blur px-4 py-2 text-sm font-bold text-white hover:bg-black/60 transition-colors"
        >
          <span>←</span> Back
        </button>

        {/* Profile Avatar Overlapping */}
        <div className="absolute -bottom-12 left-8 sm:left-12 flex items-end gap-5">
          <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-2xl flex items-center justify-center text-5xl font-black text-white border-4 border-[#0c0518]">
            {avatarLetter(profile.syncCode)}
          </div>
          <div className="mb-14">
            <h1 className="text-3xl font-black text-white drop-shadow-lg leading-none">Buddy Code: {profile.syncCode}</h1>
            <p className="text-xs font-mono text-zinc-300 mt-1.5 opacity-80 backdrop-blur-sm drop-shadow bg-black/20 px-2 py-0.5 rounded inline-block">Use this code to connect</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 px-8 sm:px-12 mt-16 max-w-5xl mx-auto">
        {/* Left Column - Stats */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-6 backdrop-blur shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Current Status</h3>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 text-xl">🔥</div>
              <div>
                <p className="text-sm font-bold text-white">{profile.streak} Days</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Study Streak</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xl">
                {profile.companionType === "fire" ? "🐉" : profile.companionType === "water" ? "🌊" : "🍃"}
              </div>
              <div>
                <p className="text-sm font-bold text-white capitalize">{profile.companionType || "Egg"} Companion</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Focus Pet</p>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="rounded-3xl border border-violet-500/20 bg-violet-950/10 p-6 backdrop-blur shadow-lg flex flex-col items-center text-center">
            {profile.connectionStatus === "connected" ? (
              <>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl mb-3">🤝</div>
                <h4 className="text-base font-bold text-white mb-1">Already Friends</h4>
                <p className="text-xs text-zinc-400 mb-4">You are connected with this user.</p>
                <button onClick={() => navigate("/buddies")} className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-bold text-white hover:bg-zinc-700">Open Chat</button>
              </>
            ) : profile.connectionStatus === "request_sent" ? (
              <>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xl mb-3">⏳</div>
                <h4 className="text-base font-bold text-white mb-1">Request Sent</h4>
                <p className="text-xs text-zinc-400 mb-4">Waiting for them to accept.</p>
                <button disabled className="w-full rounded-xl bg-zinc-800/50 py-3 text-sm font-bold text-zinc-500 cursor-not-allowed">Pending</button>
              </>
            ) : profile.connectionStatus === "request_received" ? (
              <>
                <div className="h-12 w-12 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 text-xl mb-3">👋</div>
                <h4 className="text-base font-bold text-white mb-1">They Requested You</h4>
                <p className="text-xs text-zinc-400 mb-4">They want to study with you!</p>
                <button onClick={() => navigate("/buddies")} className="w-full rounded-xl bg-fuchsia-600 py-3 text-sm font-bold text-white hover:bg-fuchsia-500">Go to Mailbox</button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xl mb-3">✨</div>
                <h4 className="text-base font-bold text-white mb-1">Let's Connect</h4>
                <p className="text-xs text-zinc-400 mb-4">Send a request to start studying together.</p>
                <button 
                  onClick={handleSendRequest}
                  disabled={requesting}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-violet-900/30"
                >
                  {requesting ? "Sending..." : "Send Request"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-8 backdrop-blur shadow-lg">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-3">
              Network Synergy
              <span className="inline-flex items-center rounded-lg bg-fuchsia-500/20 px-2 py-1 border border-fuchsia-500/30 text-xs font-bold text-fuchsia-300">
                {profile.matchScore}% Match
              </span>
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">{profile.matchReason}</p>

            <div className="mt-8 grid sm:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-zinc-950/50 p-5 border border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-3">They Excel At</p>
                {profile.theyCanHelpYouWith.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {profile.theyCanHelpYouWith.map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-semibold text-zinc-200">{s}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Nothing specific to teach you right now.</p>
                )}
              </div>

              <div className="rounded-2xl bg-zinc-950/50 p-5 border border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-3">You Can Teach Them</p>
                {profile.youCanHelpThemWith.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {profile.youCanHelpThemWith.map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                        <span className="text-sm font-semibold text-zinc-200">{s}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">They seem well-versed in your strong subjects.</p>
                )}
              </div>
            </div>

            {/* AI Bio & Interests */}
            {(profile.learnerSummary || profile.interests?.length > 0) && (
              <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                {profile.learnerSummary && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                      <span className="text-fuchsia-500 text-xs">✨</span> AI Learner Insights
                    </h4>
                    <p className="text-sm text-zinc-300 leading-relaxed italic bg-zinc-950/30 p-4 rounded-2xl border border-white/5">
                      "{profile.learnerSummary}"
                    </p>
                  </div>
                )}

                {profile.interests?.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Academic Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Study Style & Mastery levels */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
               <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 border border-white/5">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Study Method</p>
                 <div className="flex items-center gap-2">
                   <span className="text-xl">{profile.studyMode === 'self' ? '🦅' : '🤝'}</span>
                   <div>
                     <p className="text-sm font-bold text-white uppercase">{profile.studyMode === 'self' ? 'Lone Wolf' : 'Social Learner'}</p>
                     <p className="text-[10px] text-zinc-500 font-medium">Targets {profile.weeklyStudyHoursTarget}h per week</p>
                   </div>
                 </div>
               </div>

               {profile.subjectMastery?.length > 0 && (
                 <div className="rounded-2xl bg-zinc-900 p-5 border border-white/5">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Subject Mastery</p>
                   <div className="space-y-3">
                     {profile.subjectMastery.slice(0, 3).map(m => (
                       <div key={m.subject} className="space-y-1">
                         <div className="flex justify-between text-[10px]">
                           <span className="text-zinc-300 font-bold">{m.subject}</span>
                           <span className="text-zinc-500">Lvl {m.currentLevel}</span>
                         </div>
                         <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500" 
                             style={{ width: `${(m.currentLevel / 10) * 100}%` }}
                           />
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
