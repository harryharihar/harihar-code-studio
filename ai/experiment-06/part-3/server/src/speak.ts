import OpenAI from "openai";

// Same key as Part 1 and Part 2, server only. A voice that arrives a minute
// late is useless, so give up after 15 s; the card still goes out without it.
const openai = new OpenAI({ timeout: 15_000, maxRetries: 0 });

// How the assistant should sound. gpt-4o-mini-tts follows these instructions.
const VOICE_STYLE =
  "You are a friendly Indian voice assistant. Speak natural Hinglish with a warm Indian accent. " +
  "Keep a slightly quick, relaxed pace, like talking to a friend. Short and clear, not like an announcement.";

// Some replies come again and again ("Kitne baje yaad dilaun?"). Same text +
// same voice → reuse the audio we already made: no wait, no cost.
const MAX_CACHE = 100;
const cache = new Map<string, Buffer>();

export type Speech = { audio: Buffer; cached: boolean; ms: number };

export async function speak(text: string): Promise<Speech> {
  const voice = process.env.TTS_VOICE ?? "ash";
  const model = process.env.TTS_MODEL ?? "gpt-4o-mini-tts";
  const key = `${voice}|${text}`;
  const started = Date.now();

  const hit = cache.get(key);
  if (hit) {
    cache.delete(key); // move to the end = "recently used"
    cache.set(key, hit);
    return { audio: hit, cached: true, ms: Date.now() - started };
  }

  const res = await openai.audio.speech.create({
    model,
    voice,
    input: text,
    instructions: VOICE_STYLE,
    response_format: "mp3",
  });
  const audio = Buffer.from(await res.arrayBuffer());

  cache.set(key, audio);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!); // drop the oldest
  return { audio, cached: false, ms: Date.now() - started };
}
