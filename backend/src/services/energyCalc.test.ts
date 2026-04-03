import assert from "node:assert/strict";
import test from "node:test";
import { calcEnergyFromSessions } from "./energyCalc.js";

test("energy is constant while idle", () => {
  const r1 = calcEnergyFromSessions([], { nowMs: 0 });
  const r2 = calcEnergyFromSessions([], { nowMs: 123456 });
  assert.equal(r1.energyPercent, 100);
  assert.equal(r2.energyPercent, 100);
});

test("breaks recharge energy (relative to no-break)", () => {
  const t0 = new Date("2026-01-01T10:00:00Z");
  const t30 = new Date("2026-01-01T10:30:00Z");
  const t40 = new Date("2026-01-01T10:40:00Z");
  const noBreak = calcEnergyFromSessions([
    { started_at: t0, ended_at: t40, session_mood: "normal", pauses: [] },
  ]);
  const withBreak = calcEnergyFromSessions([
    {
      started_at: t0,
      ended_at: t40,
      session_mood: "normal",
      pauses: [{ started_at: t30, ended_at: t40 }],
    },
  ]);
  assert.ok(withBreak.energyPercent > noBreak.energyPercent);
});

test("tired drains faster than normal; motivated drains slower", () => {
  const t0 = new Date("2026-01-01T10:00:00Z");
  const t20 = new Date("2026-01-01T10:20:00Z");
  const tired = calcEnergyFromSessions([
    { started_at: t0, ended_at: t20, session_mood: "tired", pauses: [] },
  ]);
  const normal = calcEnergyFromSessions([
    { started_at: t0, ended_at: t20, session_mood: "normal", pauses: [] },
  ]);
  const motivated = calcEnergyFromSessions([
    { started_at: t0, ended_at: t20, session_mood: "motivated", pauses: [] },
  ]);
  assert.ok(tired.energyPercent < normal.energyPercent);
  assert.ok(motivated.energyPercent > normal.energyPercent);
});
