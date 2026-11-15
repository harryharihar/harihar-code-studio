// Lab 3: the agent. Same goal, same tools, but now there is a loop: plan → act → observe → decide.
import "dotenv/config";
import { runAgent } from "../src/agent";
import { needEnv, openaiLLM } from "../src/llm";
import { memoryStore } from "../src/store";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const goal = process.argv[2] ?? "Prepare me for a Senior React Native interview in seven days.";

(async () => {
  const store = memoryStore();
  const run = await store.createRun(goal);
  await runAgent(run.id, goal, { llm: openaiLLM(), store });
  for (const e of (await store.getRun(run.id))!.events) console.log(`${String(e.seq).padStart(2)} ${e.kind.toUpperCase().padEnd(8)} ${e.title}  ${e.detail.slice(0, 90)}`);
  console.log(`\n${(await store.listTasks()).length} tasks are on the calendar.`);
})();
