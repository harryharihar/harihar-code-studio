export type Source = {
  id: string;
  content: string;
  similarity: number;
};

export type RAGResponse = {
  question: string;
  answer: string;
  sources: Source[];
};

const API_URL = "http://localhost:3003";

export async function askRAG(
  question: string,
): Promise<RAGResponse> {
  const response = await fetch(`${API_URL}/api/rag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `RAG API failed (${response.status}): ${message}`,
    );
  }

  return (await response.json()) as RAGResponse;
}
