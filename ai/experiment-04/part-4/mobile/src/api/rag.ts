export type Source = {
  id: string;
  content: string;
  similarity: number;
};

export type RAGResponse = {
  question: string;
  answer: string;
  sources: Source[];
  confidence: number;
  groundedness: number;
  grounded: boolean;
};

export type CompareResponse = {
  question: string;
  rag: RAGResponse;
  noRag: {
    answer: string;
  };
};

const API_URL = "http://localhost:3004";

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `API request failed (${response.status}): ${message}`,
    );
  }

  return response.json() as Promise<T>;
}

export function askRAG(
  question: string,
): Promise<RAGResponse> {
  return post<RAGResponse>("/api/rag", { question });
}

export function compareAnswers(
  question: string,
): Promise<CompareResponse> {
  return post<CompareResponse>("/api/compare", { question });
}
