// Lab 9: the human in the loop, with a real model.
// Your rule: ask me above ₹1,000. The agent orders the small things, then PAUSES at the cake.
// The lab plays "you": it says NO ("too expensive") and the agent picks a cheaper cake by itself.
import "dotenv/config";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { addDays, today } from "../src/clock";
import { runExecutor } from "../src/execute";
import { needEnv, openaiLLM } from "../src/llm";
import { rupees } from "../src/shops";
import { migrate, pgStore, type Db } from "../src/store";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const day = (n: number) => addDays(today().date, n);

(async () => {
  const db: Db = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : (new PGlite() as any);
  await migrate(db);
  await (db as any).query("truncate runs, run_events, plans, tasks, settings, memory, approvals, grants cascade"); // a lab: start clean
  const store = pgStore(db);
  await store.setPolicy({ maxAuto: 1000, alwaysAsk: [] });
  const plan = await store.createRun("Plan Riya's birthday", "plan"); await store.setStatus(plan.id, "done");
  for (const t of [
    { ref: "t1", title: "Send the invitations", kind: "invite" as const, cost: 0 },
    { ref: "t2", title: "Book the decoration", kind: "decor" as const, cost: 600 },
    { ref: "t3", title: "Order the birthday cake", kind: "cake" as const, cost: 1300 },
    { ref: "t4", title: "Order the snacks", kind: "food" as const, cost: 900 },
  ])
    await store.addTask({ runId: plan.id, day: day(3), notes: "", dependsOn: [], ...t });
  await store.setBudget(5000);
  const run = await store.createRun("Order everything in my accepted plan.", "execute");
  const llm = openaiLLM();

  console.log("── 1. the agent works … until it needs you ──");
  await runExecutor(run.id, { llm, store });
  let r = (await store.getRun(run.id))!;
  const [a] = await store.listApprovals({ status: "pending" });
  console.log(`   status: ${r.status}`);
  if (!a) return console.log("   (no question this time: the model picked shops under ₹1,000)");
  console.log(`   ❓ May I order ${a.taskTitle} from ${a.shop} for ${rupees(a.price)}? (${a.reason})`);

  console.log("\n── 2. you say NO: “too expensive” ──");
  const answer = (await store.decideApproval(a.id, "rejected", "too expensive, find a cheaper cake"))!;
  await runExecutor(run.id, { llm, store, answer });

  r = (await store.getRun(run.id))!;
  for (const e of r.events) console.log(`${e.kind.toUpperCase().padEnd(9)} ${e.title.padEnd(26)} ${e.detail.slice(0, 100)}`);
  console.log(`\nStatus: ${r.status}\n`);
  for (const t of await store.listTasks()) console.log(`${t.ref} ${t.title.padEnd(24)} ${t.order ? `${t.order.shop} · ${rupees(t.order.price)}` : t.skipped ? "skipped" : "not ordered"}`);
  await (db as any).end?.(); await (db as any).close?.();
})();
