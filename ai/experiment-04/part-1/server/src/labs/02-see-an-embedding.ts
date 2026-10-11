// LAB 02 — What does an embedding actually look like?
// Run: npm run lab:2
import "dotenv/config";

import { createEmbedding } from "../embeddings";

async function main() {
  const vector = await createEmbedding("refund policy");

  console.log("Text        : refund policy");
  console.log("Type        :", Array.isArray(vector) ? "number[]" : typeof vector);
  console.log("Dimensions  :", vector.length);
  console.log("First 8     :", vector.slice(0, 8).map((n) => n.toFixed(4)));

  const length = Math.sqrt(vector.reduce((sum, n) => sum + n * n, 0));
  console.log("Length      :", length.toFixed(4));
}

main().catch(console.error);
