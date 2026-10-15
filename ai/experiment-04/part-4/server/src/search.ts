import { pool } from "./database";
import { createEmbedding } from "./embeddings";

export type SearchResult = {
  id: string;
  content: string;
  similarity: number;
};

export async function searchDocuments(
  query: string,
  topK = 3,
): Promise<SearchResult[]> {
  const embedding = await createEmbedding(query);
  const vector = `[${embedding.join(",")}]`;

  const result = await pool.query(
    `
      SELECT
        id,
        content,
        1 - (embedding <=> $1::vector) AS similarity
      FROM documents
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
    [vector, topK],
  );

  return result.rows.map((row) => ({
    id: row.id,
    content: row.content,
    similarity: Number(row.similarity),
  }));
}
