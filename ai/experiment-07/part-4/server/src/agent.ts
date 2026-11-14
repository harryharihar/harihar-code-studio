import { today } from "./clock";
import type { Item, LLM } from "./llm";
import { callTool, toolDefs } from "./tools";
import type { Store } from "./types";

export const MAX_STEPS = 10; // the agent must always be able to stop

export function instructions(now = today()) {
  return `You are Mission Control, an agent that turns a goal into tasks on the user's calendar.
Today is ${now.weekday}, ${now.date}.

Work in a loop: decide → use a tool → read the result → decide again.
- First call get_today. Never invent a date.
- Then create the tasks one by one with create_task. One task per day, 60 to 120 minutes each.
- Before every tool call, write ONE short sentence: what you will do and why.
- When the goal is fully covered, stop calling tools and give a two-sentence summary.`;
}

// The whole idea of an agent, in one loop.
export async function runAgent(runId: string, goal: string, deps: { llm: LLM; store: Store }) {
  const { llm, store } = deps;
  const input: Item[] = [{ role: "user", content: goal }];
  const say = (kind: Parameters<Store["addEvent"]>[1], title: string, detail = "") => store.addEvent(runId, kind, title, detail);

  await say("goal", "Goal received", goal);
  let sawTool = false;

  for (let step = 1; step <= MAX_STEPS; step++) {
    const res = await llm.respond({ instructions: instructions(), input, tools: toolDefs() });
    input.push(...res.output); // the model's own words and tool requests become part of the history

    for (const item of res.output) {
      if (item.type === "message") {
        const text = item.content?.map((c: any) => c.text ?? "").join("").trim();
        if (text) await say(sawTool ? "decide" : "plan", sawTool ? "Deciding next step" : "Planning", text);
      }
    }

    const calls = res.output.filter((i: Item) => i.type === "function_call");
    if (calls.length === 0) {
      await say("final", "Goal complete", res.text);
      await store.setStatus(runId, "done");
      return;
    }

    for (const call of calls) {
      sawTool = true;
      await say("act", call.name, call.arguments);
      const result = await callTool(call.name, call.arguments, { store, runId });
      await say("observe", call.name, JSON.stringify(result));
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }
  }

  await say("final", "Stopped: step limit reached", `The agent used all ${MAX_STEPS} steps.`);
  await store.setStatus(runId, "done");
}
