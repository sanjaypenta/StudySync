import assert from "node:assert/strict";
import test from "node:test";
import { buildSyllabusDayTasks, distributePlan } from "./planDistributor.js";

test("distributePlan spreads hours within cap", () => {
  const plan = distributePlan({
    taskTitle: "Quiz",
    totalHours: 6,
    today: "2026-04-02",
    deadline: "2026-04-04",
    dailyLimit: 3,
    burnoutLevel: "low",
  });
  const sum = plan.reduce((s, d) => s + d.hours, 0);
  assert.ok(Math.abs(sum - 6) < 0.5);
  for (const d of plan) {
    assert.ok(d.hours <= 3);
  }
});

test("high burnout reduces effective daily load", () => {
  const low = distributePlan({
    taskTitle: "T",
    totalHours: 8,
    today: "2026-04-01",
    deadline: "2026-04-05",
    dailyLimit: 4,
    burnoutLevel: "low",
  });
  const high = distributePlan({
    taskTitle: "T",
    totalHours: 8,
    today: "2026-04-01",
    deadline: "2026-04-05",
    dailyLimit: 4,
    burnoutLevel: "high",
  });
  const maxLow = Math.max(...low.map((d) => d.hours));
  const maxHigh = Math.max(...high.map((d) => d.hours));
  assert.ok(maxHigh <= maxLow + 0.01);
});

test("distributePlan other goal uses inferred topics in labels when context has outline", () => {
  const plan = distributePlan({
    taskTitle: "software engineering",
    totalHours: 2,
    today: "2026-04-02",
    deadline: "2026-04-03",
    dailyLimit: 2,
    burnoutLevel: "low",
    goalType: "other",
    topics: "",
    contextText:
      "1. Introduction to Software Engineering\n2. Requirements analysis\n3. Design patterns",
    subject: "Software Engineering",
  });
  assert.equal(plan.length, 2);
  assert.match(plan[0].task, /Introduction to Software Engineering/i);
  assert.ok(!plan[0].task.includes("block"));
});

const TOPICS_15 = [
  "T01",
  "T02",
  "T03",
  "T04",
  "T05",
  "T06",
  "T07",
  "T08",
  "T09",
  "T10",
  "T11",
  "T12",
  "T13",
  "T14",
  "T15",
];

test("buildSyllabusDayTasks batches three topics per day then revision", () => {
  const tasks = buildSyllabusDayTasks(TOPICS_15, 8, 3, "quiz_exam", "SE");
  assert.ok(tasks);
  assert.equal(tasks!.length, 8);
  assert.match(tasks![0], /^Learning: T01 · T02 · T03$/);
  assert.match(tasks![4], /^Learning: T13 · T14 · T15$/);
  assert.match(tasks![5], /^Revision: SE \(1\/3\)$/);
  assert.match(tasks![7], /^Revision: SE \(3\/3\)$/);
});

test("distributePlan uses syllabus batching for fifteen topic lines", () => {
  const plan = distributePlan({
    taskTitle: "SE",
    totalHours: 8,
    today: "2026-04-02",
    deadline: "2026-04-09",
    dailyLimit: 4,
    burnoutLevel: "low",
    goalType: "quiz_exam",
    topics: TOPICS_15.join("\n"),
    topicsPerDay: 3,
  });
  assert.equal(plan.length, 8);
  assert.match(plan[0].task, /^Learning: T01 · T02 · T03$/);
  assert.match(plan[5].task, /^Revision: SE \(1\/3\)$/);
});

test("buildSyllabusDayTasks packs more topics per day when calendar is short", () => {
  const tasks = buildSyllabusDayTasks(TOPICS_15, 3, 3, "other", "SE");
  assert.ok(tasks);
  assert.equal(tasks!.length, 3);
  assert.ok(tasks![0].includes("T01"));
  assert.ok(tasks![0].includes("T05"));
});
