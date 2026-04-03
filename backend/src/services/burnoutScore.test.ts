import assert from "node:assert";
import { test } from "node:test";
import { computeBurnoutScore } from "./burnoutScore.js";

test("computeBurnoutScore green when rested and productive", () => {
  const r = computeBurnoutScore({
    activeDrain: 0,
    completedTasks: 5,
  });
  // Energy goes UP with tasks, so it will hit 100
  assert.ok(r.score >= 70);
  assert.equal(r.state, "green");
});

test("computeBurnoutScore red when drained", () => {
  const r = computeBurnoutScore({
    activeDrain: 180, // 3 hours at 1.0 drain
    completedTasks: 0,
  });
  // 100 - 180 = < 0 => clamped to 0
  assert.ok(r.score < 45);
  assert.equal(r.state, "red");
});
