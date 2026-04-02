import type { RewardEvent } from "@/lib/api";
import type { RewardPayload } from "@/context/RewardContext";

export function pushRewardFromApi(
  push: (r: RewardPayload) => void,
  reward?: RewardEvent
) {
  if (!reward) return;
  const tierUp = reward.tierBefore !== reward.tierAfter;
  const extra = reward.milestones.filter(Boolean).join(" · ");
  push({
    title: `+${reward.pointsEarned} XP`,
    subtitle: `Streak ${reward.streakAfter}${extra ? ` · ${extra}` : ""}`,
    tierUp,
  });
}
