import assert from "node:assert/strict";
import test from "node:test";
import { validatePlanDays } from "./gemini.js";

test("validatePlanDays accepts valid array", () => {
  const input = {
    taskTitle: "DBMS",
    subject: "CS",
    totalHours: 3,
    deadline: "2026-04-05",
    today: "2026-04-02",
    dailyLimit: 2,
    burnoutLevel: "low" as const,
    preferredStudyStyle: "light" as const,
    goalType: "other" as const,
    topics: "",
    contextText: "",
    topicsPerDay: 3,
  };
  const v = validatePlanDays(
    [
      { date: "2026-04-02", hours: 1, task: "DBMS" },
      { date: "2026-04-03", hours: 1, task: "DBMS" },
    ],
    input
  );
  assert.equal(v?.length, 2);
});

test("validatePlanDays rejects over daily limit", () => {
  const input = {
    taskTitle: "DBMS",
    subject: "CS",
    totalHours: 3,
    deadline: "2026-04-05",
    today: "2026-04-02",
    dailyLimit: 2,
    burnoutLevel: "low" as const,
    preferredStudyStyle: "light" as const,
    goalType: "other" as const,
    topics: "",
    contextText: "",
    topicsPerDay: 3,
  };
  const v = validatePlanDays(
    [{ date: "2026-04-02", hours: 3, task: "DBMS" }],
    input
  );
  assert.equal(v, null);
});
