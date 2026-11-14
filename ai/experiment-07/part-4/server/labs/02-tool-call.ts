// Lab 2: tool calling. The model asks for ONE tool, we run it, and we stop. No loop, no next step.
import "dotenv/config";
import { today } from "../src/clock";
import { needEnv, openaiLLM } from "../src/llm";
import { memoryStore } from "../src/store";
import { callTool, toolDefs } from "../src/tools";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const goal = "Prepare me for a Senior React Native interview in seven days.";

(async () => {
  const store = memoryStore();
  const run = await store.createRun(goal);
  const res = await openaiLLM().respond({
    instructions: `Today is ${today().date}. Use a tool if it helps.`,
    input: [{ role: "user", content: goal }],
    tools: toolDefs(),
  });
  const call = res.output.find((i: any) => i.type === "function_call");
  if (!call) return console.log("The model answered in text only:\n" + res.text);
  console.log(`\nTOOL CALL: ${call.name}(${call.arguments})`);
  console.log("RESULT:", await callTool(call.name, call.arguments, { store, runId: run.id }));
  console.log("\n→ One action, then it stops. It never looks at the result. That is not an agent yet.");
})();
