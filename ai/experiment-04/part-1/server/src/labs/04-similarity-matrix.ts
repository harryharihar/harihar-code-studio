// LAB 04 — Every question vs every document, as a table
// Run: npm run lab:4
import "dotenv/config";

import { documents } from "../documents";
import { createEmbedding } from "../embeddings";
import { cosineSimilarity } from "../similarity";

const questions = [
  "How long do I have to get my money back?",
  "Can I stop my order?",
  "When will my parcel arrive?",
  "I moved house, can I change where it goes?",
];

async function main() {
  const docVectors: number[][] = [];
  for (const document of documents) {
    docVectors.push(await createEmbedding(document.content));
  }

  const table: Record<string, Record<string, string>> = {};

  for (const question of questions) {
    const q = await createEmbedding(question);
    const row: Record<string, string> = {};

    documents.forEach((document, i) => {
      row[document.id] = cosineSimilarity(q, docVectors[i]).toFixed(3);
    });

    table[question] = row;
  }

  console.table(table);
}

main().catch(console.error);
