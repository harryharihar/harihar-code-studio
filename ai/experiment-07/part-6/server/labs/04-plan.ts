// Lab 4: goal → structured plan. The model fills a Zod schema, then our code checks it.
import "dotenv/config";
import { checkPlan, makePlan } from "../src/plan";
import { needEnv, openaiLLM } from "../src/llm";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const goal = process.argv[2] ?? "Plan my sister's birthday party this Saturday. Budget ₹5,000.";

(async () => {
  const { plan, problems, fixed, order } = await makePlan(goal, openaiLLM());
  console.log(`\n${plan.summary}\nBudget: ₹${plan.budget} · planned: ₹${plan.tasks.reduce((n, t) => n + t.cost, 0)}\n`);
  for (const t of plan.tasks) console.log(`Day ${t.day} · ₹${String(t.cost).padStart(5)} · ${t.priority.padEnd(6)} · ${t.id} ${t.title}${t.dependsOn.length ? `  (after ${t.dependsOn.join(", ")})` : ""}`);
  console.log("\nExecution order:", order.join(" → "));
  console.log("Problems left:", problems.length, "| fixed on the way:", fixed.length);
  console.log("Re-check:", checkPlan(plan).length === 0 ? "valid ✓" : "invalid");
})();
