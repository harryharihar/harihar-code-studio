// Part 5: ask our own server for a short-lived live-call key.
// The real OpenAI key stays on the server; this one expires in minutes.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3006";

export async function getLiveSecret(): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/live/session`, { method: "POST" });
  } catch {
    throw new Error("Can't reach server. Make sure the backend is running.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || typeof data?.secret !== "string") {
    throw new Error(data?.error || `Couldn't start the call (${res.status}).`);
  }
  return data.secret;
}
