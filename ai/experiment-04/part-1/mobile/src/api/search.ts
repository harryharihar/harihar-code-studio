export type SearchResult = {
    id: string;
    content: string;
    similarity: number;
  };
  
  type SearchResponse = {
    query: string;
    results: SearchResult[];
  };
  
  const API_URL = "http://localhost:3001";
  
  export async function searchDocuments(
    query: string,
  ): Promise<SearchResponse> {
    const response = await fetch(`${API_URL}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
      }),
    });
  
    if (!response.ok) {
      throw new Error("Failed to search documents");
    }
  
    return response.json();
  }