// Part 5: live conversation. The server does ONE job here: it asks OpenAI for a
// short-lived key (client secret) and locks the assistant's behaviour into it.
// The phone then talks to OpenAI directly over WebRTC, so the real API key never leaves this server.
import { nowInIndia } from "./assistant";

const BASE = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

// The voices the Realtime API can use. OpenAI does not label them by gender;
// this is how they sound to us. Pick one with REALTIME_VOICE in .env and listen to it first in the Audio playground.
export const LIVE_VOICES = {
  marin: "female · newest, best quality",
  coral: "female · warm and friendly",
  shimmer: "female · soft and calm",
  sage: "female · calm and clear",
  alloy: "neutral · balanced",
  ballad: "expressive · storyteller",
  verse: "male · lively",
  ash: "male · relaxed",
  echo: "male · steady",
  cedar: "male · newest, best quality",
} as const;

// A wrong name in .env falls back to marin instead of breaking the call.
export function pickVoice(name = process.env.REALTIME_VOICE) {
  return name && name in LIVE_VOICES ? name : "marin";
}

// The assistant can DO two things during the call. Both run on the phone,
// because the saved list and the notifications live there.
export const LIVE_TOOLS = [
  {
    type: "function",
    name: "save_item",
    description:
      "Save a reminder, task or note on the user's phone. Call it ONLY after the user has said yes to your 'save kar doon?' question.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "title", "date", "time", "in_minutes", "people", "priority", "said"],
      properties: {
        kind: { type: "string", enum: ["reminder", "task", "note"] },
        title: { type: "string", description: "A few words. No date or time in it." },
        date: { type: ["string", "null"], description: "YYYY-MM-DD, or null if the user gave no day" },
        time: { type: ["string", "null"], description: "HH:MM, 24-hour, or null if the user gave no time" },
        in_minutes: {
          type: ["integer", "null"],
          description: "For 'do minute baad' / '2 ghante baad': the number of minutes from now. Then date and time are null.",
        },
        people: { type: "array", items: { type: "string" } },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        said: { type: "string", description: "The user's own words, as they said them" },
      },
    },
  },
  {
    type: "function",
    name: "get_plan",
    description: "Read the user's saved list. Call it before answering any question about their plan, list or schedule.",
    parameters: { type: "object", additionalProperties: false, required: [], properties: {} },
  },
] as const;

export function liveInstructions(now = nowInIndia()) {
  return `You are the voice of a productivity assistant, talking live with an Indian user, like a phone call.
You are a young woman. In Hindi always use feminine forms about yourself: "sun rahi hoon", "yaad dila dungi", "kar diya".
Speak clear, natural Hindi, with English words for technical terms. If the user speaks English, answer in clear English.

Today is ${now.weekday}, ${now.date}. When this call started it was ${now.time} IST.

How you talk:
- Short. One or two sentences, max 14 words. People are listening, not reading.
- Say times the way people say them: "kal shaam 5 baje", never "17:00".
- Say any number above 12 in English words, so it cannot be misheard ("thirty-nine", not "unchaalis").
- Start the call with a one-line greeting, then wait.

What you do:
- The user says a reminder, task or note. Repeat the key detail and ask "save kar doon?". Do NOT save yet.
- Only after a clear yes (haan, ok, theek hai, kar do), call save_item. Then say one short confirmation.
- If they change something ("6 baje kar do"), ask "save kar doon?" again with the new detail.
- If they say no, say "Theek hai, save nahi kiya." and do not call any tool.
- A reminder needs a time. If it is missing, ask only: "Kitne baje yaad dilaun?".
- "do minute baad", "2 ghante baad": use in_minutes. Do not work out the clock time yourself.
- aaj = today, kal = tomorrow, parso = day after tomorrow. "subah 9 baje" = 09:00, "shaam 5 baje" = 17:00.
- A time with no day ("shaam 6 baje"): leave date null, the phone picks today or tomorrow.
- Never invent a date, time or person the user did not say. Use null.
- For any question about their plan, call get_plan first, then answer only from what it returns.
- If a tool returns ok: false, tell the user what is wrong in one short sentence and ask for it.`;
}

// POST /v1/realtime/client_secrets: the session settings go in here, so the phone cannot change them.
export async function createLiveSecret() {
  const res = await fetch(`${BASE}/realtime/client_secrets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: process.env.REALTIME_MODEL,
        instructions: liveInstructions(),
        tools: LIVE_TOOLS,
        tool_choice: "auto",
        audio: {
          input: {
            noise_reduction: { type: "near_field" }, // phone held near the mouth
            transcription: { model: process.env.TRANSCRIBE_MODEL, prompt: "Hinglish phone call. Write Hindi in Roman letters, never Devanagari or Urdu. Short answers are common: Haan. Nahi. Theek hai. Ok. Haan, save kar do. Nahi, 10 baje kar do. Example: Kal subah 9 baje client ko call karna hai." }, // the on-screen text, same rule as Part 1
            turn_detection: { type: "semantic_vad", eagerness: "medium" }, // knows when the sentence is over
          },
          output: { voice: pickVoice() },
        },
      },
    }),
  });

  const data: any = await res.json().catch(() => null);
  if (!res.ok || typeof data?.value !== "string") {
    throw new Error(`client_secrets failed (${res.status}): ${data?.error?.message ?? "no value in response"}`);
  }
  return { secret: data.value as string, expiresAt: (data.expires_at ?? null) as number | null };
}
