import assert from "node:assert/strict";
import test from "node:test";
import {
  filterBannerLines,
  filterGenericTopicLines,
  mergeUserTopicsWithExtracted,
} from "./topicMerge.js";

test("mergeUserTopicsWithExtracted prepends user and dedupes extracted", () => {
  const m = mergeUserTopicsWithExtracted("A\nB", ["b", "C", "a"]);
  const lines = m.split("\n");
  assert.deepEqual(lines, ["A", "B", "C"]);
});

test("mergeUserTopicsWithExtracted uses extracted when user empty", () => {
  const m = mergeUserTopicsWithExtracted("", ["One", "Two"]);
  assert.equal(m, "One\nTwo");
});

test("mergeUserTopicsWithExtracted handles null extracted", () => {
  const m = mergeUserTopicsWithExtracted("X", null);
  assert.equal(m, "X");
});

test("filterGenericTopicLines drops subject match when others remain", () => {
  const m = filterGenericTopicLines(
    "Software Engineering\nNormalization\nSQL",
    "Software Engineering",
    "Midterm"
  );
  assert.equal(m, "Normalization\nSQL");
});

test("filterGenericTopicLines keeps all when only generic lines", () => {
  const m = filterGenericTopicLines(
    "Software Engineering",
    "Software Engineering",
    "Exam"
  );
  assert.equal(m, "Software Engineering");
});

test("filterBannerLines drops quick-notes style lines", () => {
  const m = filterBannerLines(
    "SOFTWARE ENGINEERING – QUICK NOTES\nAgile\nTDD",
    "Software Engineering"
  );
  assert.equal(m, "Agile\nTDD");
});

test("filterBannerLines drops introduction-to-subject when other lines remain", () => {
  const m = filterBannerLines(
    "Introduction to Software Engineering\nUML diagrams",
    "Software Engineering"
  );
  assert.equal(m, "UML diagrams");
});

test("filterBannerLines keeps introduction line when it is the only outline item", () => {
  const m = filterBannerLines(
    "Introduction to Software Engineering",
    "Software Engineering"
  );
  assert.equal(m, "Introduction to Software Engineering");
});
