import assert from "node:assert/strict";
import test from "node:test";
import { extractNumberedOutlineLines } from "./numberedOutline.js";

const SAMPLE = `
📘 SOFTWARE ENGINEERING – QUICK NOTES
1. Introduction to Software Engineering
Some body text.
2. Software Development Life Cycle (SDLC)
3. SDLC Models
1. Waterfall Model
2. Agile Model
4. Requirements Engineering
5. Software Design
6. UML Diagrams
7. Coding & Implementation
8. Software Testing
9. Software Maintenance
10. Software Project Management
11. Risk Management
12. Quality Assurance (QA)
13. Software Metrics
14. CASE Tools
15. DevOps
⭐ Important Exam Questions
1. Explain SDLC phases
`;

test("extractNumberedOutlineLines skips nested enumerations and stops at exam section", () => {
  const lines = extractNumberedOutlineLines(SAMPLE);
  assert.equal(lines.length, 15);
  assert.equal(lines[0], "Introduction to Software Engineering");
  assert.equal(lines[2], "SDLC Models");
  assert.equal(lines[3], "Requirements Engineering");
  assert.equal(lines[14], "DevOps");
});

test("extractNumberedOutlineLines returns empty for no numbered headings", () => {
  assert.deepEqual(extractNumberedOutlineLines("Just prose without numbers."), []);
});
