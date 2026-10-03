import "dotenv/config";

import {
  buildIndex,
  searchDocuments,
} from "./search";

async function main() {
  await buildIndex();

  const queries = [
    "How long do I have to request a refund?",
    "Can I cancel my order?",
    "How long does delivery take?",
  ];

  for (const query of queries) {
    console.log("\n================================");
    console.log("QUERY:");
    console.log(query);
    console.log("================================");

    const results = await searchDocuments(query);

    for (const result of results) {
      console.log("\n-------------------------");

      console.log("Document:", result.id);

      console.log(
        "Similarity:",
        result.similarity.toFixed(4),
      );

      console.log("Content:");

      console.log(result.content);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});