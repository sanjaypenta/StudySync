import { useCallback, useEffect, useRef, useState } from "react";
import {
  getBreakPlan,
  type BreakPlan,
  type SessionMood,
} from "@/lib/sessionBreakPolicy";

type Opts = {
  active: boolean;
  mood: SessionMood | null;
  energyPercent: number | null;
  nowMs: number;
  /** Session start time (ms); break segments align with focus timer */
  sessionAnchorMs: number | null;
  onNudge: (plan: BreakPlan) => void;
};

/**
 * Fires onNudge once per work segment when elapsed work time crosses policy threshold.
 * Call resetSegment() after user acknowledges to start the next segment from "now".
 */
export function useFocusBreaks({
  active,
  mood,
  energyPercent,
  nowMs,
  sessionAnchorMs,
  onNudge,
}: Opts) {
  const [segmentEpoch, setSegmentEpoch] = useState(0);
  const segmentStartMsRef = useRef<number>(0);
  const nudgedEpochRef = useRef(-1);
  const onNudgeRef = useRef(onNudge);
  onNudgeRef.current = onNudge;

  const resetSegment = useCallback(() => {
    segmentStartMsRef.current = Date.now();
    setSegmentEpoch((e) => e + 1);
    nudgedEpochRef.current = -1;
  }, []);

  useEffect(() => {
    if (!active || mood == null || sessionAnchorMs == null) {
      return;
    }
    segmentStartMsRef.current = sessionAnchorMs;
    nudgedEpochRef.current = -1;
    setSegmentEpoch((e) => e + 1);
  }, [active, mood, sessionAnchorMs]);

  useEffect(() => {
    if (!active || mood == null || sessionAnchorMs == null) return;
    const plan = getBreakPlan(mood, energyPercent, segmentEpoch);
    const elapsedMin = (nowMs - segmentStartMsRef.current) / 60000;
    if (
      elapsedMin >= plan.workMinutesBeforeNudge &&
      nudgedEpochRef.current !== segmentEpoch
    ) {
      nudgedEpochRef.current = segmentEpoch;
      onNudgeRef.current(plan);
    }
  }, [active, mood, energyPercent, nowMs, segmentEpoch, sessionAnchorMs]);

  return { resetSegment, segmentEpoch };
}
