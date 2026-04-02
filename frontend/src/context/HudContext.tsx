import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  fetchGamificationState,
  recalculateWellbeing,
  type GamificationState,
} from "@/lib/api";

type HudCtx = {
  state: GamificationState | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const C = createContext<HudCtx | null>(null);

export function HudProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GamificationState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      await recalculateWellbeing();
    } catch {
      /* offline */
    }
    const s = await fetchGamificationState();
    setState(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 45000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  return (
    <C.Provider value={{ state, loading, refresh }}>{children}</C.Provider>
  );
}

export function useHud() {
  const v = useContext(C);
  if (!v) throw new Error("useHud requires HudProvider");
  return v;
}
