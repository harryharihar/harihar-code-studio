import request from "supertest";
import { createApp } from "../src/app";
import { runExecutor } from "../src/execute";
import { extractNotes, notesBlock } from "../src/memory";
import { runPlanner } from "../src/plan";
import type { PlanTask } from "../src/schemas";
import { memoryStore } from "../src/store";
import type { Kind, Store } from "../src/types";
import { call, msg, scripted } from "./helpers";
import { closePg, pg } from "./pg";

afterAll(closePg);

const NOW = () => new Date("2026-11-09T18:30:00Z");
const noWait = async () => {};
const out = (input: any[]) => JSON.parse(input[input.length - 1].output);

async function setup(store: Store, tasks: { ref: string; kind: Kind; cost: number }[], budget = 5000) {
  const plan = await store.createRun("plan", "plan");
  await store.setStatus(plan.id, "done");
  for (const t of tasks) await store.addTask({ runId: plan.id, title: `Order ${t.kind}`, day: "2026-11-14", notes: "", ref: t.ref, kind: t.kind, cost: t.cost, dependsOn: [] });
  await store.setBudget(budget);
  return (await store.createRun("Order everything in my accepted plan.", "execute")).id;
}

const PARTY = [
  { ref: "t1", kind: "cake" as Kind, cost: 1000 },
  { ref: "t2", kind: "decor" as Kind, cost: 1000 },
  { ref: "t3", kind: "gift" as Kind, cost: 1000 },
];

// A model that "dies" with the server: the 3rd call never comes back, like pressing Ctrl+C.
const powerCut = () =>
  scripted([
    [msg("I'll order the cake first."), call("place_order", { taskId: "t1", shop: "Sweet Treats Bakery" })],
    [call("place_order", { taskId: "t2", shop: "Party Pals" })],
    () => {
      throw new Error("server stopped");
    },
  ]);

describe.each([["memory", async () => memoryStore()], ["postgres", pg]])("%s store", (_name, make) => {
  test("RESUME: the server stops after 2 orders → interrupted → resume orders only the rest, nothing twice", async () => {
    const store = await make();
    const runId = await setup(store, PARTY);

    // 1. the run starts, orders t1 and t2, then the server stops
    await expect(runExecutor(runId, { llm: powerCut(), store, now: NOW, sleep: noWait })).rejects.toThrow("server stopped");
    const cp = (await store.loadCheckpoint(runId))!;
    expect(cp.usage.steps).toBe(2); // the checkpoint after the 2nd finished step
    expect(cp.input.filter((i: any) => i.type === "function_call_output")).toHaveLength(2);

    // 2. the server starts again
    expect(await store.markInterrupted()).toBe(1);
    expect((await store.getRun(runId))!.status).toBe("interrupted");
    const before = (await store.listTasks()).map((t) => t.order?.id ?? null);

    // 3. Resume: the model gets its old conversation back, tries t1 again (refused), then finishes t3
    const seen: any[] = [];
    const llm = scripted([
      (input) => {
        seen.push(...input);
        return [call("place_order", { taskId: "t1", shop: "Sweet Treats Bakery" })];
      },
      (input) => {
        expect(out(input).error).toMatch(/t1 is already ordered from Sweet Treats Bakery .* Never order it twice/);
        return [call("get_next_task", {})];
      },
      (input) => {
        expect(out(input).task.id).toBe("t3");
        return [call("place_order", { taskId: "t3", shop: "Gift Galaxy" })];
      },
      [msg("All three are ordered.")],
    ]);
    await runExecutor(runId, { llm, store, resume: true, now: NOW, sleep: noWait });

    expect(seen.filter((i) => i.type === "function_call_output")).toHaveLength(2); // the old conversation came back
    expect(seen.at(-1).content).toMatch(/server restarted\. 2 of 3 things are already ordered/);
    const run = (await store.getRun(runId))!;
    expect(run.status).toBe("done");
    expect(run.usage.steps).toBe(6); // 2 before + 4 after: the step budget kept counting
    const resumed = run.events.find((e) => e.kind === "resume")!;
    expect(resumed.detail).toMatch(/^2 of 3 already ordered: not ordered again · 1 left/);
    const after = await store.listTasks();
    expect(after.slice(0, 2).map((t) => t.order!.id)).toEqual(before.slice(0, 2)); // t1 and t2: the SAME orders, not new ones
    expect(after.every((t) => t.order && t.verified)).toBe(true);
    expect(run.events.at(-1)!.title).toBe("All 3 things ordered · ₹2,850 of ₹5,000");
  });

  test("an order saved just before the stop (never verified) is verified on resume, not ordered again", async () => {
    const store = await make();
    const runId = await setup(store, PARTY.slice(0, 2));
    const [t1] = await store.listTasks();
    await store.updateTask(t1.id, { order: { id: "#1041", shop: "Cake Corner", item: "cake", price: 800, eta: "Sat" }, verified: false });
    await store.markInterrupted();
    const llm = scripted([[call("get_next_task", {})], (i) => (expect(out(i).task.id).toBe("t2"), [call("place_order", { taskId: "t2", shop: "Party Pals" })]), [msg("Done.")]]);
    await runExecutor(runId, { llm, store, resume: true, now: NOW, sleep: noWait });
    const run = (await store.getRun(runId))!;
    expect(run.events.find((e) => e.kind === "verify")!.detail).toMatch(/t1 · Cake Corner · ₹800 · saved before the restart/);
    expect(run.status).toBe("done");
    expect((await store.listTasks())[0].order!.id).toBe("#1041");
  });

  test("LONG-TERM MEMORY: the planner reads saved notes and saves new ones", async () => {
    const store = await make();
    await store.addNote("Riya is vegetarian");
    const plan = { goal: "g", summary: "A small veg party.", days: 3, budget: 5000, tasks: ["t1", "t2", "t3", "t4"].map((id): PlanTask => ({ id, title: id, why: "w", day: 1, cost: 500, priority: "normal", kind: "other", dependsOn: [] })) };
    const llm = scripted([], [plan, { notes: ["Riya loves chocolate", "Riya is vegetarian", "Riya loves chocolate"] }]);
    const run = await store.createRun("Plan Riya's party. She loves chocolate.", "plan");
    await runPlanner(run.id, "Plan Riya's party. She loves chocolate.", { llm, store });

    expect(llm.parseInputs[0]).toBe("Saved notes about the user (always respect them):\n- Riya is vegetarian\n\nGoal: Plan Riya's party. She loves chocolate.");
    expect((await store.getPlan(run.id))!.notes).toEqual(["Riya is vegetarian"]);
    expect((await store.listNotes()).map((n) => n.content)).toEqual(["Riya is vegetarian", "Riya loves chocolate"]);
    const events = (await store.getRun(run.id))!.events;
    expect(events.filter((e) => e.kind === "memory").map((e) => e.title)).toEqual(["Remembered 1 note", "Saved 1 new note"]);
    expect(events.at(-1)!.title).toBe("Plan ready");
  });
});

test("a broken memory step never blocks the plan", async () => {
  const store = memoryStore();
  const plan = { goal: "g", summary: "s", days: 3, budget: 5000, tasks: ["t1", "t2", "t3", "t4"].map((id): PlanTask => ({ id, title: id, why: "w", day: 1, cost: 500, priority: "normal", kind: "other", dependsOn: [] })) };
  const llm = scripted([], [plan, { nonsense: true }]);
  const run = await store.createRun("goal goal", "plan");
  await runPlanner(run.id, "goal goal", { llm, store });
  expect((await store.getRun(run.id))!.status).toBe("done");
  expect(await store.listNotes()).toEqual([]);
});

test("notes are trimmed, de-duplicated and at most 4", async () => {
  const llm = scripted([], [{ notes: [" A is veg ", "a is VEG", "B", "Likes red", "Lives in Pune", "Has a dog", "Loves cake"] }]);
  expect(await extractNotes("goal", llm)).toEqual(["A is veg", "Likes red", "Lives in Pune", "Has a dog"]);
  expect(notesBlock([])).toBe("");
});

test("the executor's instructions carry the notes", async () => {
  const store = memoryStore();
  await store.addNote("Riya loves chocolate");
  const runId = await setup(store, PARTY.slice(0, 1));
  let instructions = "";
  const llm = { ...scripted([[msg("stop")]]), async respond(o: any) { instructions = o.instructions; return { output: [msg("stop")], text: "stop", tokens: 1 }; } };
  await runExecutor(runId, { llm: llm as any, store, now: NOW, sleep: noWait });
  expect(instructions).toMatch(/- Riya loves chocolate/);
  expect(instructions).toMatch(/pick the shop whose item fits that note/);
});

describe("API", () => {
  test("history, resume rules and memory", async () => {
    const store = memoryStore();
    const app = createApp({ llm: scripted([[msg("Done.")]]), store });
    const plan = await store.createRun("plan", "plan");
    const exec = await store.createRun("Order everything in my accepted plan.", "execute");
    await store.markInterrupted();

    const runs = (await request(app).get("/api/runs").expect(200)).body.runs;
    expect(runs.map((r: any) => [r.kind, r.status])).toEqual([["execute", "interrupted"], ["plan", "interrupted"]]);
    expect((await request(app).post(`/api/runs/${plan.id}/resume`).expect(409)).body.error).toMatch(/Only an ordering run/);
    await request(app).post(`/api/runs/${exec.id}/resume`).expect(202);
    await new Promise((r) => setTimeout(r, 20));
    expect((await request(app).post(`/api/runs/${exec.id}/resume`).expect(409)).body.error).toMatch(/not interrupted/);
    expect((await request(app).get(`/api/runs/${exec.id}`).expect(200)).body.events.some((e: any) => e.kind === "resume")).toBe(true);

    const { note } = (await request(app).post("/api/memory").send({ content: "Riya is vegetarian" }).expect(201)).body;
    await request(app).post("/api/memory").send({ content: "riya is vegetarian" }).expect(409);
    await request(app).post("/api/memory").send({ content: "x" }).expect(400);
    expect((await request(app).get("/api/memory").expect(200)).body.notes.map((n: any) => n.content)).toEqual(["Riya is vegetarian"]);
    await request(app).delete(`/api/memory/${note.id}`).expect(200);
    await request(app).delete(`/api/memory/${note.id}`).expect(404);
    expect((await request(app).get("/health").expect(200)).body.part).toBe(4);
  });
});
