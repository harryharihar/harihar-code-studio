import { documents } from "./documents";
import { createEmbedding } from "./embeddings";
import { cosineSimilarity } from "./similarity";

type IndexedDocument = {
  id: string;
  content: string;
  embedding: number[];
};

export type SearchResult = {
  id: string;
  content: string;
  similarity: number;
};

let index: IndexedDocument[] = [];

export async function buildIndex() {
  console.log("Building embedding index...");

  index = [];

  for (const document of documents) {
    console.log(`Creating embedding for ${document.id}...`);

    const embedding = await createEmbedding(document.content);

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

export async function searchDocuments(
  queries: string,
  topK = 3,
): Promise<SearchResult[]> {
  if (index.length === 0) {
    throw new Error(
      "Embedding index has not been initialized.",
    );
  }

  const queryEmbedding = await createEmbedding(queries);

  const results: SearchResult[] = index.map((document) => ({
    id: document.id,
    content: document.content,
    similarity: cosineSimilarity(
      queryEmbedding,
      document.embedding,
    ),
  }));

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}