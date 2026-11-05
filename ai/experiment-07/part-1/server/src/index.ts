import "dotenv/config";
import { createApp } from "./app";
import { needEnv, openaiLLM } from "./llm";
import { memoryStore } from "./store";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const port = Number(process.env.PORT || 3007);

createApp({ llm: openaiLLM(), store: memoryStore() }).listen(port, "0.0.0.0", () => {
  console.log(`Mission Control · Part 1 · http://localhost:${port} · model: ${process.env.AGENT_MODEL}`);
});
