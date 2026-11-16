// Lab 7: no AI here. A fake model that is stuck: it asks the same thing again and again.
// Watch the loop guard block it, then stop the run. Without the guard it would burn money forever.
import { runExecutor } from "../src/execute";
import { memoryStore } from "../src/store";
import { call, scripted } from "../test/helpers";

(async () => {
  const store = memoryStore();
  await store.addTask({ runId: "lab", title: "Order the cake", day: "2030-01-07", notes: "", ref: "t1", kind: "cake", cost: 1000 });
  await store.setBudget(5000);
  const run = await store.createRun("lab 7");
  const stuck = scripted([[call("get_next_task", {})]]); // same call, every single time

  await runExecutor(run.id, { llm: stuck, store });

  const r = (await store.getRun(run.id))!;
  for (const e of r.events) console.log(`${e.kind.toUpperCase().padEnd(8)} ${e.title.padEnd(28)} ${e.detail.slice(0, 90)}`);
  console.log(`\nThe model was called ${stuck.calls} times, then our code stopped it. Status: ${r.status}`);
})();
