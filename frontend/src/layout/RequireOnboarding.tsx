import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { fetchServerProfile } from "@/lib/api";
import { isOnboardingCompleteLocal } from "@/lib/onboardingStorage";

export function RequireOnboarding() {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "ok" | "need">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const p = await fetchServerProfile();
      if (cancelled) return;
      if (p === "error") {
        setState(isOnboardingCompleteLocal() ? "ok" : "need");
        return;
      }
      if (p === null) {
        setState(isOnboardingCompleteLocal() ? "ok" : "need");
        return;
      }
      setState(p.onboardingComplete ? "ok" : "need");
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <div className="flex gap-2">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-violet-900/50" />
          <div className="h-12 w-32 animate-pulse rounded-2xl bg-fuchsia-900/40" />
        </div>
        <div className="h-4 w-48 animate-pulse rounded bg-violet-900/30" />
        <p className="text-sm text-violet-300/90">Syncing your quest data…</p>
      </div>
    );
  }

  if (state === "need") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
