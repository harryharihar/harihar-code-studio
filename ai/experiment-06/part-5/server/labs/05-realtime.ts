// Lab: ask OpenAI for a live-call key, before wiring it into the app.
// Run: npm run lab:5
// It prints only whether it worked and when the key expires. The key itself is never printed.
import "dotenv/config";
import { createLiveSecret, LIVE_TOOLS, LIVE_VOICES, pickVoice } from "../src/live";

async function main() {
  const voice = pickVoice();
  console.log(`Model: ${process.env.REALTIME_MODEL} · Voice: ${voice} (${LIVE_VOICES[voice as keyof typeof LIVE_VOICES]})`);
  console.log(`Tools: ${LIVE_TOOLS.map((t) => t.name).join(", ")}\n`);

  console.time("key ready in");
  const { secret, expiresAt } = await createLiveSecret();
  console.timeEnd("key ready in");

  console.log(`Got a short-lived key (${secret.length} characters, starts with "${secret.slice(0, 3)}")`);
  if (expiresAt) console.log(`Expires: ${new Date(expiresAt * 1000).toLocaleTimeString()}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
