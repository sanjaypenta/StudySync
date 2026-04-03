import assert from "node:assert/strict";
import test from "node:test";
import { answersEquivalent, normalizeForAnswerMatch } from "./answerMatch.js";

test("normalizeForAnswerMatch collapses whitespace and trims", () => {
  assert.equal(normalizeForAnswerMatch("  a   b\n c  "), "a b c");
});

test("answersEquivalent ignores trailing punctuation", () => {
  assert.equal(
    answersEquivalent(
      "The union of two regular languages is regular",
      "The union of two regular languages is regular."
    ),
    true
  );
});

test("answersEquivalent ignores wrapping quotes and Unicode spaces", () => {
  assert.equal(
    answersEquivalent(
      "“The union of two regular languages is regular”\u00A0",
      "The union of two regular languages is regular"
    ),
    true
  );
});

test("answersEquivalent does not equate different answers", () => {
  assert.equal(
    answersEquivalent(
      "The intersection of two regular languages is regular",
      "The union of two regular languages is regular"
    ),
    false
  );
});
