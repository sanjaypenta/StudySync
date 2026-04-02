import test from "node:test";
import assert from "node:assert/strict";
import { computeBurnoutScore } from "./burnoutScore.js";

test("computeBurnoutScore green when healthy inputs", () => {
  const r = computeBurnoutScore({
    completionRate: 0.9,
    sessionRatio: 0.85,
    screenStress: 0.1,
  });
  assert.equal(r.state, "green");
  assert.ok(r.score >= 70);
});

test("computeBurnoutScore red when poor inputs", () => {
  const r = computeBurnoutScore({
    completionRate: 0.1,
    sessionRatio: 0.1,
    screenStress: 0.9,
  });
  assert.equal(r.state, "red");
});
