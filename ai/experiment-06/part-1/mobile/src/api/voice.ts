import { File } from "expo-file-system";

// localhost reaches the Mac only from the iOS Simulator.
// For a physical device, set EXPO_PUBLIC_API_URL to your Mac's LAN IP.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3006";

export async function transcribe(uri: string): Promise<string> {
  const form = new FormData();
  // Since SDK 52, Expo's fetch rejects the old { uri, name, type } object,
  // so we pass a real File. "audio" is the same field name curl used.
  form.append("audio", new File(uri), "voice.m4a");

  let res: Response;
  try {
    // No Content-Type header: fetch must set the multipart boundary itself.
    res = await fetch(`${API_URL}/api/transcribe`, { method: "POST", body: form });
  } catch {
    throw new Error("Can't reach server. Make sure the backend is running.");
  }

  // A proxy or crashed server may answer with HTML instead of JSON.
  let data: { text?: string; error?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error(`The server sent an unexpected response (${res.status}).`);
  }

  if (!res.ok || typeof data.text !== "string") {
    throw new Error(data.error || `Request failed (${res.status}).`);
  }
  return data.text;
}
