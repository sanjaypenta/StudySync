import assert from "node:assert/strict";
import test from "node:test";
import { inferTopicsFromContextText } from "./topicHeuristics.js";

test("inferTopicsFromContextText picks numbered lines", () => {
  const text = `
Software Engineering
1.1 Introduction
2.0 Requirements Engineering
3 Design Patterns
Some long prose sentence that should not be picked because it goes on and on and on.
`;
  const topics = inferTopicsFromContextText(
    text,
    "Software Engineering",
    "Exam prep"
  );
  assert.ok(topics.length >= 2);
  assert.ok(topics.some((t) => /Introduction/i.test(t)));
});
