import OpenAI from "openai";

// Same key as Part 1 and Part 2, server only. A voice that arrives a minute
// late is useless, so give up after 15 s; the card still goes out without it.
const openai = new OpenAI({ timeout: 15_000, maxRetries: 0 });

// How the assistant should sound. gpt-4o-mini-tts follows these instructions.
const VOICE_STYLE =
  "You are a friendly young Indian woman, a voice assistant. Speak clear, natural Hindi, and clear English when the sentence is English, with a warm Indian accent. " +
  "Keep a slightly quick, relaxed pace, like talking to a friend. Short and clear, not like an announcement.";

// Some replies come again and again ("Kitne baje yaad dilaun?"). Same text +
// same voice → reuse the audio we already made: no wait, no cost.
const MAX_CACHE = 100;
const cache = new Map<string, Buffer>();

// Hindi number names are easy to mix up (39 "unchaalis" came out as 29 "untees"),
// so numbers above 12 are spoken in English. Hours like "9 baje" stay as they are.
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function inWords(v: number) {
  return v < 20 ? ONES[v] : TENS[Math.floor(v / 10)] + (v % 10 ? `-${ONES[v % 10]}` : "");
}

export function forSpeech(text: string) {
  return text
    // "4:39 baje" → "four thirty-nine baje", "4:05" → "four oh-five", "4:00" → "four"
    .replace(/\b([1-9]|1[0-2]):([0-5]\d)\b/g, (_, h, m) => {
      const mm = Number(m);
      return [inWords(Number(h)), mm === 0 ? "" : mm < 10 ? `oh-${ONES[mm]}` : inWords(mm)].filter(Boolean).join(" ");
    })
    .replace(/\b(1[3-9]|[2-9]\d)\b/g, (n) => inWords(Number(n)));
}

export type Speech = { audio: Buffer; cached: boolean; ms: number };

export async function speak(text: string): Promise<Speech> {
  const voice = process.env.TTS_VOICE ?? "coral";
  const model = process.env.TTS_MODEL ?? "gpt-4o-mini-tts";
  text = forSpeech(text);
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
