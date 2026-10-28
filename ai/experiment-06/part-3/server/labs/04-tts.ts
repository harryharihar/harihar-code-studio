// Lab: text → MP3 with OpenAI text-to-speech, before wiring it into the app.
// Run: npm run lab:4, then play it with: afplay reply.mp3
import "dotenv/config";
import { writeFileSync } from "node:fs";
import OpenAI from "openai";

const openai = new OpenAI();
const REPLY = "Theek hai, kal subah 9 baje client ko call karne ki yaad dila dunga.";

async function main() {
  const model = process.env.TTS_MODEL ?? "gpt-4o-mini-tts";
  const voice = process.env.TTS_VOICE ?? "ash";
  console.log(`Model: ${model} · Voice: ${voice}`);
  console.log(`Text:  "${REPLY}"\n`);

  console.time("voice ready in");
  const res = await openai.audio.speech.create({
    model,
    voice,
    input: REPLY,
    instructions: "Speak like a friendly Indian assistant, in natural Hinglish.",
    response_format: "mp3",
  });
  const mp3 = Buffer.from(await res.arrayBuffer());
  console.timeEnd("voice ready in");

  writeFileSync("reply.mp3", mp3);
  console.log(`Saved reply.mp3 (${Math.round(mp3.length / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
