// Lab 8: memory and state with a real model.
// The agent remembers two notes about Riya, starts ordering, and the "server" stops after 2 model calls.
// Then we do what the server does when it starts again: mark the run interrupted and resume it.
// Uses your DATABASE_URL if it is set, otherwise PGlite (a Postgres inside Node, nothing to install).
import "dotenv/config";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { addDays, today } from "../src/clock";
import { runExecutor } from "../src/execute";
import { needEnv, openaiLLM, type LLM } from "../src/llm";
import { rupees } from "../src/shops";
import { migrate, pgStore, type Db } from "../src/store";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const day = (n: number) => addDays(today().date, n);

// The real model, but it "dies" with the server after `n` calls.
function stopsAfter(n: number, llm: LLM): LLM {
  let calls = 0;
  return { ...llm, respond: async (o) => (++calls > n ? Promise.reject(new Error("the server stopped")) : llm.respond(o)) };
}

(async () => {
  const db: Db = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : (new PGlite() as any);
  await migrate(db);
  const store = pgStore(db);
  await (db as any).query("truncate runs, run_events, plans, tasks, settings, memory cascade"); // a lab: start clean

  await store.addNote("Riya is vegetarian");
  await store.addNote("Riya loves chocolate");
  const plan = await store.createRun("Plan Riya's 10th birthday", "plan");
  await store.setStatus(plan.id, "done");
  for (const t of [
    { ref: "t1", title: "Order the birthday cake", kind: "cake" as const, cost: 1200 },
    { ref: "t2", title: "Order the snacks", kind: "food" as const, cost: 1000 },
    { ref: "t3", title: "Book the decoration", kind: "decor" as const, cost: 1500 },
    { ref: "t4", title: "Buy return gifts", kind: "gift" as const, cost: 700 },
  ])
    await store.addTask({ runId: plan.id, day: day(3), notes: "", dependsOn: [], ...t });
  await store.setBudget(5000);

  const run = await store.createRun("Order everything in my accepted plan.", "execute");
  console.log("── 1. ordering … and the server stops ──");
  await runExecutor(run.id, { llm: stopsAfter(2, openaiLLM()), store }).catch((e) => console.log(`   ✕ ${e.message}`));
  for (const t of await store.listTasks()) console.log(`   ${t.ref} ${t.title.padEnd(24)} ${t.order ? `${t.order.shop} ${rupees(t.order.price)} ${t.order.id}` : "—"}`);

  console.log("\n── 2. the server starts again ──");
  console.log(`   ${await store.markInterrupted()} run marked interrupted`);

  console.log("\n── 3. Resume ──");
  await runExecutor(run.id, { llm: openaiLLM(), store, resume: true });
  const r = (await store.getRun(run.id))!;
  for (const e of r.events) console.log(`${e.kind.toUpperCase().padEnd(8)} ${e.title.padEnd(26)} ${e.detail.slice(0, 110)}`);
  console.log(`\nStatus: ${r.status} · ${r.usage.steps} model calls · ${r.usage.seconds} s\n`);
  for (const t of await store.listTasks()) console.log(`${t.ref} ${t.title.padEnd(24)} ${t.order ? `${t.order.shop} · ${t.order.item} · ${rupees(t.order.price)} ${t.order.id}` : "not ordered"}`);
  await (db as any).end?.();
  await (db as any).close?.();
})();
