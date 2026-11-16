// Lab 1: a plain chatbot. One question in, one answer out. Nothing is saved, nothing happens.
import "dotenv/config";
import { needEnv, openaiLLM } from "../src/llm";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const goal = "Prepare me for a Senior React Native interview in seven days.";

(async () => {
  const res = await openaiLLM().respond({ instructions: "You are a helpful assistant. Be brief.", input: [{ role: "user", content: goal }] });
  console.log("\nCHATBOT says:\n" + res.text);
  console.log("\n→ Advice only. Your calendar is still empty.");
})();
