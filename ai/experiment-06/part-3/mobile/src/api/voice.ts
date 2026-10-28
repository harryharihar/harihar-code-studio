import { File } from "expo-file-system";

import type { AssistantResult } from "@/types";

// localhost reaches the Mac only from the iOS Simulator.
// For a physical device, set EXPO_PUBLIC_API_URL to your Mac's LAN IP.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3006";

// One trip does it all. The server turns the voice into text (Part 1), the
// text into an action (Part 2), and the reply into voice (Part 3). If the AI
// asked a follow-up question last time, the earlier sentence goes along as context.
export async function askAssistant(uri: string, context?: string): Promise<AssistantResult> {
  const form = new FormData();
  // Since SDK 52, Expo's fetch rejects the old { uri, name, type } object,
  // so we pass a real File. "audio" is the same field name curl used.
  form.append("audio", new File(uri), "voice.m4a");
  if (context) form.append("context", context);

  const data = await post("/api/voice-assistant", form); // ab jawab mein audio bhi
  if (typeof data.text !== "string") {
    throw new Error("The server sent an unexpected response.");
  }
  return { text: data.text, action: data.action ?? null, audio: data.audio, cached: data.cached };
}

async function post(path: string, form: FormData) {
  let res: Response;
  try {
    // No Content-Type header: fetch must set the multipart boundary itself.
    res = await fetch(`${API_URL}${path}`, { method: "POST", body: form });
  } catch {
    throw new Error("Can't reach server. Make sure the backend is running.");
  }

  // A proxy or crashed server may answer with HTML instead of JSON.
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`The server sent an unexpected response (${res.status}).`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status}).`);
  }
  return data;
}
