// LAB 03 — Cosine similarity with vectors small enough to check in your head
// Run: npm run lab:3
import { cosineSimilarity } from "../similarity";

const tests: [string, number[], number[]][] = [
  ["same direction      ", [1, 1], [1, 1]],
  ["same direction, 10x ", [1, 1], [10, 10]],
  ["45 degrees apart    ", [1, 0], [1, 1]],
  ["perpendicular (90°) ", [1, 0], [0, 1]],
  ["opposite (180°)     ", [1, 0], [-1, 0]],
];

for (const [label, a, b] of tests) {
  console.log(label, JSON.stringify(a), JSON.stringify(b), "→", cosineSimilarity(a, b).toFixed(3));
}
