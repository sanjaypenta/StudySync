import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type RewardPayload = {
  title: string;
  subtitle?: string;
  tierUp?: boolean;
};

type Ctx = {
  push: (r: RewardPayload) => void;
  queue: RewardPayload[];
  dismiss: () => void;
};

const C = createContext<Ctx | null>(null);

export function RewardProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<RewardPayload[]>([]);

  const push = useCallback((r: RewardPayload) => {
    setQueue((q) => [...q, r]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  return (
    <C.Provider value={{ push, queue, dismiss }}>{children}</C.Provider>
  );
}

export function useRewards() {
  const v = useContext(C);
  if (!v) throw new Error("useRewards requires RewardProvider");
  return v;
}
