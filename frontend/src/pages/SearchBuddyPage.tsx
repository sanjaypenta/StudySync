import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { authHeaders, searchBuddyByCode } from "@/lib/api";

type BuddyRec = {
  userId: string;
  syncCode: string;
  matchScore: number;
  matchReason: string;
  theyCanHelpYouWith: string[];
  youCanHelpThemWith: string[];
};

type SearchResult = {
  userId: string;
  syncCode: string;
  companionType: string | null;
  streak: number;
};

function avatarLetter(uid: string) {
  return uid.substring(0, 2).toUpperCase();
}

export function SearchBuddyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recs, setRecs] = useState<BuddyRec[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState<string | null>(null);

  // Perform search automatically if there's a q param
  useEffect(() => {
    const q = params.get("q");
    if (q) {
      void runSearch(q);
    } else {
      setSearchResults([]);
    }
  }, [params.get("q")]);

  // Load AI recommendations
  useEffect(() => {
    (async () => {
      setRecsLoading(true);
      try {
        const res = await fetch("/api/buddies/recommend", { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) setRecsError(data.error || "Enable buddy search in Profile first.");
        else setRecs(data.recommendations ?? []);
      } catch { setRecsError("Could not load recommendations."); }
      setRecsLoading(false);
    })();
  }, []);

  async function runSearch(query: string) {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const data = await searchBuddyByCode(query.trim());
      setSearchResults(data.results);
    } catch {}
    setSearching(false);
  }

  return (
    <div className="relative min-h-[80vh] flex flex-col pt-12 px-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
        <div className="absolute top-40 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-2xl mx-auto z-10">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full bg-violet-500/20 text-violet-300 px-3 py-1 text-[10px] font-bold font-mono tracking-widest border border-violet-400/30 mb-3 uppercase">
            Global Network
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Discover Buddies</h1>
        </div>

        {/* Search Results */}
        {params.get("q") && (
          <div className="mb-10">
            <h3 className="text-sm font-black text-white mb-4">Search Results for "{params.get("q")}"</h3>
            {searching ? (
              <div className="h-24 animate-pulse rounded-2xl bg-zinc-900/50 border border-white/5" />
            ) : searchResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-500">
                No users found matching that ID.
              </div>
            ) : (
              <AnimatePresence>
                {searchResults.map(r => (
                  <motion.div
                    key={r.userId}
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-950/20 backdrop-blur-md p-5 flex items-center gap-5 shadow-xl hover:border-fuchsia-500/50 hover:bg-fuchsia-900/30 transition-all cursor-pointer group"
                    onClick={() => navigate(`/search/profile/${r.userId}`)}
                  >
                    <div className="h-14 w-14 shrink-0 rounded-full bg-fuchsia-600/30 border border-fuchsia-500/50 flex items-center justify-center text-lg font-black text-fuchsia-200 shadow-inner">
                      {avatarLetter(r.syncCode)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-white truncate">Buddy Code: {r.syncCode}</p>
                      <p className="text-xs font-bold text-fuchsia-300 mt-1 uppercase tracking-widest">🔥 {r.streak} Streak</p>
                    </div>
                    <button className="shrink-0 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-white group-hover:bg-fuchsia-600 group-hover:border-transparent transition-all shadow-sm">
                      View Profile
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* AI Recommendations */}
        <div className="mt-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <span className="text-violet-500">✨</span> AI Recommendations <span className="text-violet-500">✨</span>
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {recsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1,2,3,4].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-900/50 border border-white/5" />)}
            </div>
          ) : recsError ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-8 text-center backdrop-blur-md">
              <p className="text-sm text-rose-300">{recsError}</p>
              <Link to="/profile" className="mt-4 inline-block rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-rose-900/20 hover:bg-rose-500">Go to Profile Settings</Link>
            </div>
          ) : recs.length === 0 ? (
            <div className="text-center rounded-2xl border border-dashed border-white/10 p-10 text-zinc-500 text-sm">
              We need to learn more about you! Keep studying to get AI matches.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {recs.map(rec => (
                <div
                  key={rec.userId}
                  onClick={() => navigate(`/search/profile/${rec.userId}`)}
                  className="cursor-pointer flex flex-col justify-between rounded-2xl border border-violet-500/20 bg-zinc-900/40 p-5 shadow-lg backdrop-blur-sm transition-all hover:border-violet-500/50 hover:bg-zinc-900/80 hover:-translate-y-1 group"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg font-black text-white shadow-inner">
                        {avatarLetter(rec.syncCode)}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="text-sm font-bold text-white truncate">Buddy Code: {rec.syncCode}</h4>
                        <div className="inline-flex items-center rounded-md bg-fuchsia-500/20 px-2 py-0.5 mt-1 border border-fuchsia-500/30">
                          <p className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider">{rec.matchScore}% Synergy</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-zinc-300 leading-relaxed line-clamp-2">{rec.matchReason}</p>
                  </div>
                  <div className="mt-5 border-t border-white/5 pt-4">
                    <p className="text-xs font-bold text-violet-400 group-hover:text-violet-300 transition-colors uppercase tracking-widest flex items-center gap-1">
                      View Profile <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
