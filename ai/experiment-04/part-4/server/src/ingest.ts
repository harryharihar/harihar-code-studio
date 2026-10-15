import { documents } from "./documents";
import { pool } from "./database";
import { createEmbedding } from "./embeddings";

export async function ingestDocuments() {
  let processed = 0;

  for (const document of documents) {
    const embedding = await createEmbedding(document.content);
    const vector = `[${embedding.join(",")}]`;

    await pool.query(
      `
        INSERT INTO documents (id, content, embedding)
        VALUES ($1, $2, $3::vector)
        ON CONFLICT (id)
        DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
      `,
      [document.id, document.content, vector],
    );

    processed++;
    console.log(`Stored ${document.id}`);
  }

  return { processed };
}