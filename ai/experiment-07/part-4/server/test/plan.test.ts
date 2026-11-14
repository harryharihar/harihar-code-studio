import request from "supertest";
import { createApp } from "../src/app";
import { checkPlan, dateOf, makePlan, orderPlan } from "../src/plan";
import type { Plan, PlanTask } from "../src/schemas";
import { memoryStore } from "../src/store";
import { scripted } from "./helpers";

const task = (id: string, day: number, over: Partial<PlanTask> = {}): PlanTask => ({
  id, title: `Task ${id}`, why: "because", day, cost: 500, priority: "normal", kind: "other", dependsOn: [], ...over,
});
// a plan needs at least 4 tasks: fill up with small free ones
const fill = (tasks: PlanTask[]) => [...tasks, ...["f1", "f2", "f3", "f4"].slice(0, Math.max(0, 4 - tasks.length)).map((id) => task(id, 1, { cost: 0 }))];
const plan = (tasks: PlanTask[], days = 7, budget = 5000): Plan => ({ goal: "g", summary: "s", days, budget, tasks: fill(tasks) });

test("a good plan has no problems", () => {
  expect(checkPlan(plan([task("t1", 1), task("t2", 2, { dependsOn: ["t1"] })]))).toEqual([]);
});

test("the checker catches what a schema cannot", () => {
  const p = checkPlan(plan([
    task("t1", 1, { dependsOn: ["t9"] }),            // unknown id
    task("t2", 2, { dependsOn: ["t3"] }),            // depends on a LATER day
    task("t3", 5),
    task("t4", 9),                                    // day outside 1..7
    task("t5", 3, { cost: -20 }),                     // a negative price
  ]));
  expect(p.join("\n")).toMatch(/t9, which does not exist/);
  expect(p.join("\n")).toMatch(/planned later/);
  expect(p.join("\n")).toMatch(/day 9 is outside/);
  expect(p.join("\n")).toMatch(/cost must be a whole number/);
});

test("loops and double ids are found", () => {
  expect(checkPlan(plan([task("a", 1, { dependsOn: ["b"] }), task("b", 1, { dependsOn: ["a"] })])).join()).toMatch(/loop/);
  expect(checkPlan(plan([task("a", 1), task("a", 2)])).join()).toMatch(/twice/);
});

test("a plan that spends the whole budget is rejected: it leaves nothing for a surprise", () => {
  expect(checkPlan(plan([task("a", 1, { cost: 3000 }), task("b", 1, { cost: 2000 })])).join()).toMatch(/more than 90% of the ₹5000 budget/);
  expect(checkPlan(plan([task("a", 1, { cost: 2000 }), task("b", 1, { cost: 2000 })]))).toEqual([]);
  expect(checkPlan({ ...plan([task("a", 1)]), tasks: [task("a", 1)] }).join()).toMatch(/Too few tasks/);
});

test("if everything is high priority, nothing is", () => {
  const all = [task("a", 1, { priority: "high" }), task("b", 1, { priority: "high" }), task("c", 2, { priority: "high" })];
  expect(checkPlan(plan(all)).join()).toMatch(/3 tasks are high priority. Maximum is 2/);
  expect(checkPlan(plan([all[0], task("b", 1), task("c", 2)]))).toEqual([]);
});

test("order: dependencies first, then earlier day, then higher priority", () => {
  const p = plan([
    task("t3", 2, { dependsOn: ["t2"] }),
    task("t2", 1, { priority: "low" }),
    task("t1", 1, { priority: "high" }),
  ]);
  expect(orderPlan(p).filter((id) => id.startsWith("t"))).toEqual(["t1", "t2", "t3"]);
});

test("makePlan shows the problems to the model and accepts the repaired plan", async () => {
  const bad = plan([task("t1", 1, { dependsOn: ["t7"] })]);
  const good = plan([task("t1", 1)]);
  const llm = scripted([], [bad, good]);
  const r = await makePlan("goal", llm);
  expect(r.problems).toEqual([]);
  expect(r.fixed[0]).toMatch(/t7/);
  expect(llm.parseCalls).toBe(2);
  expect(JSON.stringify(llm.parseInputs[1])).toContain("This plan has problems");
});

test("makePlan gives up after two repairs", async () => {
  const llm = scripted([], [plan([task("t1", 1, { dependsOn: ["x"] })])]);
  const r = await makePlan("goal", llm);
  expect(r.problems.length).toBeGreaterThan(0);
  expect(llm.parseCalls).toBe(3);
});

test("day numbers become real dates", () => {
  expect(dateOf(1, "2026-11-02")).toBe("2026-11-02");
  expect(dateOf(7, "2026-11-02")).toBe("2026-11-08");
});

const finish = async (app: any, id: string) => {
  for (let i = 0; i < 50; i++) {
    const r = await request(app).get(`/api/plans/${id}`);
    if (r.body.status !== "running") return r.body;
    await new Promise((ok) => setTimeout(ok, 5));
  }
  throw new Error("the planner never finished");
};

test("API: plan → watch the steps → accept → the tasks and the budget are saved", async () => {
  const store = memoryStore();
  const llm = scripted([], [plan([task("t1", 1), task("t2", 2, { dependsOn: ["t1"] })])]);
  const app = createApp({ llm, store });
  const made = await request(app).post("/api/plans").send({ goal: "Plan my sister's birthday party this Saturday. Budget ₹5,000." });
  expect(made.status).toBe(202);
  const done = await finish(app, made.body.id);
  expect(done.events.map((e: any) => e.kind)).toEqual(["goal", "ask", "check", "order", "final"]);
  expect(done.result.order.filter((id: string) => id.startsWith("t"))).toEqual(["t1", "t2"]);
  expect((await request(app).get("/api/tasks")).body.tasks).toHaveLength(0); // nothing saved before the yes
  const ok = await request(app).post(`/api/plans/${made.body.id}/accept`);
  expect(ok.body.tasks).toHaveLength(4);
  expect(await store.getBudget()).toBe(5000);
  expect((await request(app).post(`/api/plans/${made.body.id}/accept`)).status).toBe(409);
  expect((await request(app).post("/api/plans").send({ goal: "x" })).status).toBe(400);
});

test("a new accepted plan replaces the old one", async () => {
  const store = memoryStore();
  const llm = scripted([], [plan([task("t1", 1), task("t2", 2), task("t3", 2), task("t4", 3), task("t5", 3)]), plan([task("n1", 1)])]);
  const app = createApp({ llm, store });
  for (const n of [5, 4]) {
    const { body } = await request(app).post("/api/plans").send({ goal: "A brand new goal" });
    await finish(app, body.id);
    expect((await request(app).post(`/api/plans/${body.id}/accept`)).body.tasks).toHaveLength(n);
  }
});

test("a plan that cannot be fixed ends as failed, and nothing can be accepted", async () => {
  const llm = scripted([], [plan([task("t1", 1, { dependsOn: ["x"] })])]);
  const app = createApp({ llm, store: memoryStore() });
  const { body } = await request(app).post("/api/plans").send({ goal: "A goal that goes wrong" });
  const done = await finish(app, body.id);
  expect(done.status).toBe("failed");
  expect(done.events.filter((e: any) => e.kind === "repair")).toHaveLength(2);
  expect((await request(app).post(`/api/plans/${body.id}/accept`)).status).toBe(404);
});
