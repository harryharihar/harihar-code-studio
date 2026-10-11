// LAB 05 — Typos, another language, and where embeddings get fooled
// Run: npm run lab:5
import "dotenv/config";

import { createEmbedding } from "../embeddings";
import { buildIndex, searchDocuments } from "../search";
import { cosineSimilarity } from "../similarity";

async function main() {
  await buildIndex();

  const tricky = [
    "refnd polcy plz",                              // typos
    "पैसे वापस लेने के लिए मेरे पास कितने दिन हैं?", // Hindi
  ];

  for (const query of tricky) {
    const [best] = await searchDocuments(query, 1);
    console.log(`\n"${query}"`);
    console.log(`  → ${best.id} (${best.similarity.toFixed(3)})`);
  }

  // Where it gets fooled: opposite intent, almost the same words
  const a = await createEmbedding("I want a refund");
  const b = await createEmbedding("I do not want a refund");

  console.log("\n'I want a refund' vs 'I do not want a refund'");
  console.log("  similarity:", cosineSimilarity(a, b).toFixed(3));
}

main().catch(console.error);
