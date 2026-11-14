import { memoryStore } from "../src/store";
import type { Store } from "../src/types";
import { closePg, pg } from "./pg";

// The SAME tests run against both stores. If both pass, the agent cannot tell them apart.
afterAll(closePg);

describe.each([["memory", async () => memoryStore()], ["postgres", pg]])("%s store", (_name, make) => {
  let s: Store;
  beforeEach(async () => (s = await make()));

  test("a run keeps its kind, status, usage and events in order", async () => {
    const r = await s.createRun("Order everything", "execute");
    await s.addEvent(r.id, "goal", "one");
    const e2 = await s.addEvent(r.id, "act", "two", "detail");
    await s.setUsage(r.id, { steps: 2, tokens: 300, seconds: 4 });
    await s.setStatus(r.id, "done");
    const got = (await s.getRun(r.id))!;
    expect(e2.seq).toBe(2);
    expect(got.events.map((e) => e.title)).toEqual(["one", "two"]);
    expect([got.kind, got.status, got.usage]).toEqual(["execute", "done", { steps: 2, tokens: 300, seconds: 4 }]);
  });

  test("an unknown id is just 'not found'", async () => {
    expect(await s.getRun("nope")).toBeUndefined();
    expect(await s.getRun("00000000-0000-0000-0000-000000000000")).toBeUndefined();
    expect(await s.deleteNote("nope")).toBe(false);
  });

  test("tasks keep the plan's order, and an order is saved with its task", async () => {
    const r = await s.createRun("plan", "plan");
    const a = await s.addTask({ runId: r.id, title: "Cake", day: "2026-11-14", notes: "n", ref: "t2", kind: "cake", cost: 900, dependsOn: [] });
    await s.addTask({ runId: r.id, title: "Invite", day: "2026-11-12", notes: "", ref: "t1", kind: "invite", cost: 0, dependsOn: ["t2"] });
    const order = { id: "#1041", shop: "Cake Corner", item: "Chocolate truffle cake, 1 kg", price: 720, eta: "Sat 14 Nov" };
    await s.updateTask(a.id, { order });
    await s.updateTask(a.id, { verified: true });
    const list = await s.listTasks();
    expect(list.map((t) => t.ref)).toEqual(["t2", "t1"]);
    expect(list[0]).toMatchObject({ order, verified: true, cost: 900, kind: "cake" });
    expect(list[1]).toMatchObject({ order: null, verified: false, dependsOn: ["t2"] });
    await s.updateTask(a.id, { order: null, verified: false });
    expect((await s.listTasks())[0].order).toBeNull();
  });

  test("budget and plans survive", async () => {
    await s.setBudget(5000);
    expect(await s.getBudget()).toBe(5000);
    const r = await s.createRun("goal", "plan");
    const plan = { goal: "g", summary: "s", days: 3, budget: 5000, tasks: [] };
    await s.savePlan({ id: r.id, plan, order: ["t1"], fixed: [], accepted: false, notes: ["Riya is vegetarian"] });
    await s.markAccepted(r.id);
    expect(await s.getPlan(r.id)).toEqual({ id: r.id, plan, order: ["t1"], fixed: [], accepted: true, notes: ["Riya is vegetarian"] });
  });

  test("CHECKPOINT: the conversation round-trips", async () => {
    const r = await s.createRun("run", "execute");
    expect(await s.loadCheckpoint(r.id)).toBeUndefined();
    const input = [{ role: "user", content: "hi" }, { type: "function_call", name: "get_next_task", call_id: "c1", arguments: "{}" }];
    await s.saveCheckpoint(r.id, { input, usage: { steps: 1, tokens: 100, seconds: 2 } });
    expect(await s.loadCheckpoint(r.id)).toEqual({ input, usage: { steps: 1, tokens: 100, seconds: 2 } });
  });

  test("on startup, only runs that were running become interrupted", async () => {
    const a = await s.createRun("a", "execute");
    const b = await s.createRun("b", "plan");
    await s.setStatus(b.id, "done");
    expect(await s.markInterrupted()).toBe(1);
    expect((await s.getRun(a.id))!.status).toBe("interrupted");
    expect((await s.getRun(b.id))!.status).toBe("done");
    expect(await s.markInterrupted()).toBe(0);
  });

  test("history: newest first, with the last thing that happened", async () => {
    const a = await s.createRun("first", "plan");
    await s.addEvent(a.id, "final", "Plan ready");
    await new Promise((r) => setTimeout(r, 5));
    await s.createRun("second", "execute");
    const rows = await s.listRuns();
    expect(rows.map((r) => [r.goal, r.kind, r.last])).toEqual([["second", "execute", ""], ["first", "plan", "Plan ready"]]);
  });

  test("LONG-TERM MEMORY: add, no duplicates, list, delete", async () => {
    const n = (await s.addNote("Riya is vegetarian"))!;
    expect(await s.addNote("riya is VEGETARIAN")).toBeNull();
    await s.addNote("Riya loves chocolate");
    expect((await s.listNotes()).map((x) => x.content)).toEqual(["Riya is vegetarian", "Riya loves chocolate"]);
    expect(await s.deleteNote(n.id)).toBe(true);
    expect((await s.listNotes()).map((x) => x.content)).toEqual(["Riya loves chocolate"]);
  });
});
