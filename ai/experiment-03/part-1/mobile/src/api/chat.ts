const API_URL = "http://localhost:3000";

type ChatResponse = {
  response: string;
};

export async function sendChatMessage(
  prompt: string,
): Promise<string> {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  const data: ChatResponse = await response.json();

  return data.response;
}