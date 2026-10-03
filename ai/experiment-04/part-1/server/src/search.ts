import { documents } from "./documents";
import { createEmbedding } from "./embeddings";
import { cosineSimilarity } from "./similarity";

type IndexedDocument = {
  id: string;
  content: string;
  embedding: number[];
};

let index: IndexedDocument[] = [];

export async function buildIndex() {
  console.log("Building embedding index...");

  index = [];

  for (const document of documents) {
    console.log(`Creating embedding for ${document.id}...`);

    const embedding = await createEmbedding(
      document.content,
    );

    index.push({
      id: document.id,
      content: document.content,
      embedding,
    });
  }

  console.log(
    `Embedding index ready with ${index.length} documents.`,
  );
}

export async function searchDocuments(query: string) {
  if (index.length === 0) {
    throw new Error(
      "Embedding index has not been initialized.",
    );
  }

  const queryEmbedding = await createEmbedding(query);

  const results = index.map((document) => {
    const similarity = cosineSimilarity(
      queryEmbedding,
      document.embedding,
    );

    return {
      id: document.id,
      content: document.content,
      similarity,
    };
  });

  return results.sort(
    (a, b) => b.similarity - a.similarity,
  );
}