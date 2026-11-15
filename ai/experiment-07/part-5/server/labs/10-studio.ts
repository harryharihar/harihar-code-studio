// Lab 10: a bigger goal. A real model plans a studio upgrade + a shoot trip (₹50,000), then orders it
// under YOUR rule: ask me above ₹10,000. Expensive gear makes the run pause and wait for you.
import "dotenv/config";
import { makePlan, orderPlan, dateOf } from "../src/plan";
import { openaiLLM } from "../src/llm";
import { memoryStore } from "../src/store";
import { runExecutor } from "../src/execute";
import { optionsFor, rupees } from "../src/shops";
(async () => {
  const llm = openaiLLM();
  const { plan, problems, order } = await makePlan("Upgrade my YouTube studio: a wireless mic kit, a camera and lights. Book a shoot trip to Goa next week. Budget ₹50,000.", llm);
  console.log("problems", problems, "budget", plan.budget, "days", plan.days);
  for (const id of order) { const t = plan.tasks.find((x) => x.id === id)!; console.log(id, t.kind.padEnd(7), String(t.cost).padStart(6), t.title, "→", optionsFor(t).map((o) => `${o.shop} ${rupees(o.price)}`).join(" / ")); }
  const store = memoryStore(); await store.setPolicy({ maxAuto: 10000, alwaysAsk: [] });
  const pr = await store.createRun("plan", "plan"); await store.setStatus(pr.id, "done");
  for (const id of order) { const t = plan.tasks.find((x) => x.id === id)!; await store.addTask({ runId: pr.id, title: t.title, day: dateOf(t.day), notes: t.why, ref: t.id, dependsOn: t.dependsOn, kind: t.kind, cost: t.cost }); }
  await store.setBudget(plan.budget);
  const run = await store.createRun("Order everything in my accepted plan.", "execute");
  await runExecutor(run.id, { llm, store });
  const r = (await store.getRun(run.id))!;
  console.log("status", r.status);
  for (const a of await store.listApprovals({})) console.log("ASK:", a.taskTitle, a.shop, rupees(a.price), a.reason);
  for (const t of await store.listTasks()) console.log(t.ref, t.title.padEnd(34), t.order ? `${t.order.shop} ${rupees(t.order.price)}` : "—");
})();
