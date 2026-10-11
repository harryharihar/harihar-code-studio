// LAB 01 — Can normal keyword search find the answer?
// Run: npm run lab:1
import { documents } from "../documents";

const STOP_WORDS = ["how", "do", "i", "to", "my", "have", "the", "a", "can", "is"];

function keywordSearch(query: string) {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word && !STOP_WORDS.includes(word));

  return documents.filter((document) =>
    words.some((word) => document.content.toLowerCase().includes(word)),
  );
}

const queries = [
  "How long do I have to get my money back?",
  "refund",
];

for (const query of queries) {
  const results = keywordSearch(query);

  console.log(`\nQuery: "${query}"`);
  console.log(`Matches: ${results.length}`);
  results.forEach((r) => console.log(`  → ${r.id}: ${r.content}`));
}
