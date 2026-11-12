// Lab 6: the execution loop with a real model. A small party plan, a ₹5,000 budget, a street of shops.
// Run with --flaky (practice mode) to watch a retry and a failed verification.
import "dotenv/config";
import { addDays, today } from "../src/clock";
import { runExecutor } from "../src/execute";
import { needEnv, openaiLLM } from "../src/llm";
import { rupees } from "../src/shops";
import { memoryStore } from "../src/store";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const flaky = process.argv.includes("--flaky");
const day = (n: number) => addDays(today().date, n);

(async () => {
  const store = memoryStore();
  const plan = [
    { ref: "t1", title: "Send the invitations", day: day(0), kind: "invite" as const, cost: 0, dependsOn: [] },
    { ref: "t2", title: "Order the birthday cake", day: day(3), kind: "cake" as const, cost: 1200, dependsOn: [] },
    { ref: "t3", title: "Book the decoration", day: day(2), kind: "decor" as const, cost: 1500, dependsOn: [] },
    { ref: "t4", title: "Order the snacks", day: day(3), kind: "food" as const, cost: 1000, dependsOn: ["t1"] },
    { ref: "t5", title: "Buy return gifts", day: day(2), kind: "gift" as const, cost: 700, dependsOn: [] },
  ];
  for (const t of plan) await store.addTask({ runId: "lab", notes: "", ...t });
  await store.setBudget(5000);

  const run = await store.createRun("lab 6");
  await runExecutor(run.id, { llm: openaiLLM(), store, flaky });

  const r = (await store.getRun(run.id))!;
  for (const e of r.events) console.log(`${e.kind.toUpperCase().padEnd(8)} ${e.title.padEnd(26)} ${e.detail.slice(0, 110)}`);
  console.log(`\nSpent: ${r.usage.steps} model calls · ${r.usage.tokens} tokens · ${r.usage.seconds} s\n`);
  for (const t of await store.listTasks()) console.log(`${t.ref} ${t.title.padEnd(26)} ${t.order ? `${t.order.shop} ${rupees(t.order.price)}` : "not ordered"}${t.verified ? "  ✓ checked" : ""}`);
})();
