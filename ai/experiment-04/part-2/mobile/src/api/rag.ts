export type Source = {
  id: string;
  content: string;
  similarity: number;
};

type RAGResponse = {
  question: string;
  answer: string;
  sources: Source[];
};

const API_URL = "http://localhost:3001";

export async function askRAG(
  question: string,
): Promise<RAGResponse> {
  const response = await fetch(`${API_URL}/api/rag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get an AI answer");
  }

  return response.json();
}
