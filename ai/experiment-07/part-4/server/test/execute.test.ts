import request from "supertest";
import { createApp } from "../src/app";
import { BUDGET, runExecutor } from "../src/execute";
import type { PlanTask } from "../src/schemas";
import { optionsFor, verifyOrder } from "../src/shops";
import { memoryStore } from "../src/store";
import type { Kind, Store } from "../src/types";
import { call, msg, scripted } from "./helpers";

const NOW = () => new Date("2026-11-09T18:30:00Z"); // Tue 10 Nov 2026, 00:00 in India
const SAT = "2026-11-14";
const noWait = async () => {};

async function setup(tasks: { ref: string; kind?: Kind; cost?: number; dependsOn?: string[] }[], budget = 5000) {
  const store = memoryStore();
  for (const t of tasks) await store.addTask({ runId: "plan", title: `Task ${t.ref}`, day: SAT, notes: "", ref: t.ref, kind: t.kind ?? "cake", cost: t.cost ?? 1000, dependsOn: t.dependsOn ?? [] });
  await store.setBudget(budget);
  const run = await store.createRun("run");
  return { store, runId: run.id };
}

const go = (s: { store: Store; runId: string }, llm: any, o: { flaky?: boolean; budget?: typeof BUDGET } = {}) =>
  runExecutor(s.runId, { llm, store: s.store, now: NOW, sleep: noWait, ...o });

const out = (input: any[]) => JSON.parse(input[input.length - 1].output);
const kinds = async (s: { store: Store; runId: string }) => (await s.store.getRun(s.runId))!.events.map((e) => e.kind);
const order = (ref: string, shop = "Sweet Treats Bakery") => [call("place_order", { taskId: ref, shop })];

test("every task gets three shops: cheaper, about right, premium", () => {
  const o = optionsFor({ kind: "cake", cost: 1000 });
  expect(o.map((x) => x.shop)).toEqual(["Cake Corner", "Sweet Treats Bakery", "Royal Cakes"]);
  expect(o.map((x) => x.price)).toEqual([800, 950, 1400]);
});

test("happy path: next → order → verify → order → verify → done", async () => {
  const s = await setup([{ ref: "t1" }, { ref: "t2", kind: "decor", dependsOn: ["t1"] }]);
  const llm = scripted([
    [msg("First I need the next task."), call("get_next_task", {})],
    (input) => {
      const r = out(input);
      expect(r.task.id).toBe("t1");
      expect(r.budgetLeft).toBe(5000);
      return [msg("Sweet Treats is the best-rated shop within the plan."), ...order("t1")];
    },
    (input) => {
      expect(out(input).next.task.id).toBe("t2");
      expect(out(input).next.budgetLeft).toBe(4050);
      return [call("place_order", { taskId: "t2", shop: "Party Pals" })];
    },
    [msg("Both orders are placed.")],
  ]);
  await go(s, llm);
  const run = (await s.store.getRun(s.runId))!;
  expect(run.status).toBe("done");
  expect((await kinds(s)).filter((k) => k === "verify")).toHaveLength(2);
  expect((await s.store.listTasks()).every((t) => t.verified && t.order)).toBe(true);
  expect(run.events.at(-1)!.title).toBe("All 2 things ordered · ₹1,900 of ₹5,000");
});

test("bad orders are refused with a reason the model can use", async () => {
  const s = await setup([{ ref: "t1", cost: 2000 }, { ref: "t2", kind: "gift", dependsOn: ["t1"] }], 2500);
  const errors: string[] = [];
  const llm = scripted([
    order("t2", "Toy Town"), // t1 must come first
    (i) => (errors.push(out(i).error), order("t1", "Pizza Point")), // wrong kind of shop
    (i) => (errors.push(out(i).error), order("t1", "Royal Cakes")), // ₹2,800: over the ₹2,500 budget
    (i) => (errors.push(out(i).error), order("t1", "Cake Corner")),
    (i) => (errors.push(String(out(i).ok)), order("t1", "Cake Corner")), // already ordered
    (i) => (i.at(-1).output && errors.push(out(i).error), [msg("stop")]),
  ]);
  await go(s, llm);
  expect(errors[0]).toMatch(/needs t1 first/);
  expect(errors[1]).toMatch(/does not sell this/);
  expect(errors[2]).toMatch(/Over budget: Royal Cakes costs ₹2,800, only ₹2,500 is left/);
  expect(errors[3]).toBe("true");
  expect(errors[4]).toMatch(/already ordered from Cake Corner/);
});

test("RETRY: a shop that doesn't answer is tried again by our code, the model never sees it", async () => {
  const s = await setup([{ ref: "t1" }, { ref: "t2" }]);
  const llm = scripted([
    order("t1"),
    order("t2"), // order #2 times out once
    (input) => {
      expect(out(input).ok).toBe(true);
      return [msg("Done.")];
    },
  ]);
  await go(s, llm, { flaky: true });
  const run = (await s.store.getRun(s.runId))!;
  expect(run.events.find((e) => e.kind === "retry")!.detail).toMatch(/Sweet Treats Bakery didn't answer. Trying again in 0.5 s/);
  expect(run.status).toBe("done");
});

test("VERIFY: the shop says ordered but saved nothing, and our check catches it", async () => {
  const s = await setup(["t1", "t2", "t3", "t4"].map((ref) => ({ ref, cost: 500 })));
  const llm = scripted([
    order("t1"),
    order("t2"),
    order("t3"),
    order("t4"), // order #4 is silently dropped
    (input) => {
      expect(out(input).error).toMatch(/Verification failed: t4 is NOT in the order list/);
      return order("t4"); // the model orders it again
    },
    [msg("All four are ordered.")],
  ]);
  await go(s, llm, { flaky: true });
  const verifies = (await s.store.getRun(s.runId))!.events.filter((e) => e.kind === "verify").map((e) => JSON.parse(e.detail).ok);
  expect(verifies).toEqual([true, true, true, false, true]);
  expect(await verifyOrder(s.store, "t4")).toEqual([]);
  expect((await s.store.getRun(s.runId))!.status).toBe("done");
});

test("LOOP GUARD: the same call again and again is blocked, then the run stops", async () => {
  const s = await setup([{ ref: "t1" }]);
  const llm = scripted([[call("get_next_task", {})]]); // a stuck model: always the same call
  await go(s, llm);
  const run = (await s.store.getRun(s.runId))!;
  expect(run.events.filter((e) => e.kind === "guard")).toHaveLength(3);
  expect(run.events.at(-1)!.title).toBe("Stopped by the loop guard");
  expect(run.status).toBe("failed");
  expect(llm.calls).toBe(5); // 2 allowed + 3 blocked
});

test("BUDGET: the agent stops when its step budget is used up", async () => {
  const s = await setup([{ ref: "t1" }]);
  let n = 0;
  const llm = scripted([() => (n++ % 2 ? [call("check_orders", {})] : [call("get_next_task", {})])]); // busy, never orders
  await go(s, llm, { budget: { ...BUDGET, steps: 3 } });
  const run = (await s.store.getRun(s.runId))!;
  expect(run.events.at(-1)!.title).toBe("Step budget used up");
  expect(llm.calls).toBe(3);
});

test("the model cannot just SAY it is done: our code checks the order list", async () => {
  const s = await setup([{ ref: "t1" }]);
  const llm = scripted([
    [msg("Everything is ordered!")], // it is not
    (input) => {
      expect(input.at(-1).content).toMatch(/t1 are not ordered/);
      return order("t1");
    },
    [msg("Now it is ordered.")],
  ]);
  await go(s, llm);
  expect((await s.store.getRun(s.runId))!.status).toBe("done");
});

test("API: accept a party plan → execute → the party shows every order within budget", async () => {
  const pt = (id: string, kind: PlanTask["kind"], cost: number, dependsOn: string[] = []): PlanTask => ({ id, title: `Task ${id}`, why: "w", day: 1, cost, priority: "normal", kind, dependsOn });
  // the model always takes the second shop that get_next_task / place_order offers
  const pick = (r: any) => r.next ?? r;
  const llm = scripted(
    [
      [call("get_next_task", {})],
      (input) => {
        const n = pick(out(input));
        if (n.allDone) return [msg("All ordered.")];
        return [call("place_order", { taskId: n.task.id, shop: n.options[1].shop })];
      },
    ],
    [{ goal: "g", summary: "s", days: 3, budget: 5000, tasks: [pt("t1", "invite", 0), pt("t2", "cake", 1000), pt("t3", "decor", 1500, ["t1"]), pt("t4", "gift", 1200)] }],
  );
  const app = createApp({ llm, store: memoryStore() });

  const { body: p } = await request(app).post("/api/plans").send({ goal: "Plan my sister's birthday party" }).expect(202);
  await new Promise((r) => setTimeout(r, 20));
  await request(app).post(`/api/plans/${p.id}/accept`).expect(200);

  const { body: x } = await request(app).post("/api/execute").send({}).expect(202);
  for (let i = 0; i < 50; i++) {
    const { body } = await request(app).get(`/api/runs/${x.id}`);
    if (body.status !== "running") break;
    await new Promise((r) => setTimeout(r, 20));
  }
  const { body: run } = await request(app).get(`/api/runs/${x.id}`);
  expect(run.status).toBe("done");

  const { body: party } = await request(app).get("/api/party");
  expect(party.budget).toBe(5000);
  expect(party.items.every((i: any) => i.order && i.verified)).toBe(true);
  expect(party.spent).toBe(0 + 950 + 1430 + 1140);
  expect(party.spent).toBeLessThanOrEqual(party.budget);

  await request(app).post("/api/execute").send({}).expect(409); // nothing left to order
});
