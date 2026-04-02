import { Outlet } from "react-router-dom";
import { HudProvider } from "@/context/HudContext";
import { GameHUD } from "@/components/GameHUD";
import { RewardOverlay } from "@/components/RewardOverlay";

export function GameShellLayout() {
  return (
    <HudProvider>
      <div className="min-h-screen bg-[#0c0518] text-zinc-100">
        <GameHUD />
        <RewardOverlay />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </HudProvider>
  );
}
