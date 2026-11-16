import request from "supertest";
import { createApp, sweep } from "../src/app";
import { runExecutor } from "../src/execute";
import { checkOrder, endOfDay, validPolicy } from "../src/policy";
import { memoryStore } from "../src/store";
import type { Kind, Store } from "../src/types";
import { call, msg, scripted } from "./helpers";
import { closePg, pg } from "./pg";

afterAll(closePg);
const NOW = () => new Date("2026-11-09T18:30:00Z");
const noWait = async () => {};
const out = (input: any[]) => JSON.parse(input[input.length - 1].output);
const last = (input: any[]) => input[input.length - 1];

// invitations ₹0, decoration ~₹500, cake ~₹1,200 (shops: 0.8x / 0.95x / 1.4x). Your rule: ask me above ₹1,000.
async function setup(store: Store, tasks: { ref: string; kind: Kind; cost: number }[] = [
  { ref: "t1", kind: "invite", cost: 0 }, { ref: "t2", kind: "decor", cost: 500 }, { ref: "t3", kind: "cake", cost: 1200 }]) {
  await store.setPolicy({ maxAuto: 1000, alwaysAsk: [] });
  const plan = await store.createRun("plan", "plan"); await store.setStatus(plan.id, "done");
  for (const t of tasks) await store.addTask({ runId: plan.id, title: `Order ${t.kind}`, day: "2026-11-14", notes: "", ref: t.ref, kind: t.kind, cost: t.cost, dependsOn: [] });
  await store.setBudget(5000);
  return (await store.createRun("Order everything in my accepted plan.", "execute")).id;
}
const until = (steps: (any[] | ((input: any[]) => any[]))[]) => scripted(steps);
const firstPart = [
  [call("place_order", { taskId: "t1", shop: "InviteHub" })],
  [call("place_order", { taskId: "t2", shop: "Party Pals" })],
  [msg("The cake next."), call("place_order", { taskId: "t3", shop: "Sweet Treats Bakery" })],
];

test("YOUR RULES: under the limit is fine, over it asks, 'always ask' asks, a grant covers it", () => {
  const p = { maxAuto: 1000, alwaysAsk: ["gift" as Kind] };
  expect(checkOrder(p, [], "decor", 480)).toEqual({ ok: true, by: "rule" });
  expect(checkOrder(p, [], "cake", 1140)).toEqual({ ok: false, reason: "₹1,140 is above your limit of ₹1,000." });
  expect(checkOrder(p, [], "gift", 200)).toEqual({ ok: false, reason: "Your rule: always ask before ordering gift." });
  const g = { id: "g", kind: "cake" as Kind, maxPrice: 1200, expiresAt: "2099-01-01T00:00:00Z", createdAt: "" };
  expect(checkOrder(p, [g], "cake", 1140)).toMatchObject({ ok: true, by: "grant" });
  expect(checkOrder(p, [g], "cake", 1300).ok).toBe(false);                     // above what you allowed
  expect(checkOrder(p, [{ ...g, expiresAt: "2000-01-01T00:00:00Z" }], "cake", 1140).ok).toBe(false); // expired
  expect(validPolicy({ maxAuto: -1 })).toBeNull();
  expect(validPolicy({ maxAuto: 1500, alwaysAsk: ["cake", "nope", "cake"] })).toEqual({ maxAuto: 1500, alwaysAsk: ["cake"] });
  expect(endOfDay(new Date("2026-11-14T10:00:00")).getHours()).toBe(23);
});

describe.each([["memory", async () => memoryStore()], ["postgres", pg]])("%s store", (_n, make) => {
  test("over the limit the run PAUSES: a question is saved and the run waits", async () => {
    const store = await make(); const runId = await setup(store);
    await runExecutor(runId, { llm: until(firstPart), store, now: NOW, sleep: noWait });
    const run = (await store.getRun(runId))!;
    expect(run.status).toBe("waiting");
    const [a] = await store.listApprovals({ status: "pending" });
    expect(a).toMatchObject({ taskRef: "t3", shop: "Sweet Treats Bakery", price: 1140, reason: "₹1,140 is above your limit of ₹1,000." });
    expect(run.events.at(-1)).toMatchObject({ kind: "approval", title: "Waiting for you" });
    const tasks = await store.listTasks();
    expect(tasks.map((t) => !!t.order)).toEqual([true, true, false]);           // the cake is NOT ordered yet
    expect(await store.markInterrupted()).toBe(0);                              // a restart leaves a waiting run alone
  });

  test("REJECT with a note: the model hears it and picks a cheaper shop, which needs no question", async () => {
    const store = await make(); const runId = await setup(store);
    await runExecutor(runId, { llm: until(firstPart), store, now: NOW, sleep: noWait });
    const [a] = await store.listApprovals({ status: "pending" });
    const answer = (await store.decideApproval(a.id, "rejected", "too expensive"))!;
    const llm = until([
      (input) => (expect(last(input).content).toMatch(/said NO to t3 · Sweet Treats Bakery · ₹1,140\. Their note: "too expensive"/), [call("place_order", { taskId: "t3", shop: "Cake Corner" })]),
      [msg("All ordered.")],
    ]);
    await runExecutor(runId, { llm, store, answer, now: NOW, sleep: noWait });
    const run = (await store.getRun(runId))!;
    expect(run.status).toBe("done");
    expect(run.events.some((e) => e.title === "Rejected by you" && e.detail.includes("too expensive"))).toBe(true);
    expect((await store.listTasks())[2].order).toMatchObject({ shop: "Cake Corner", price: 960 });
    expect(await store.decideApproval(a.id, "approved", "")).toBeUndefined();    // a second click changes nothing
  });

  test("APPROVE: our code places exactly the approved order, verified, then the model goes on", async () => {
    const store = await make(); const runId = await setup(store);
    await runExecutor(runId, { llm: until(firstPart), store, now: NOW, sleep: noWait });
    const [a] = await store.listApprovals({ status: "pending" });
    const answer = (await store.decideApproval(a.id, "approved", ""))!;
    const llm = until([(input) => (expect(last(input).content).toMatch(/APPROVED t3 · Sweet Treats Bakery · ₹1,140\. Our code placed it: Ordered t3/), [msg("Done.")])]);
    await runExecutor(runId, { llm, store, answer, now: NOW, sleep: noWait });
    const run = (await store.getRun(runId))!;
    expect(run.status).toBe("done");
    expect((await store.listTasks())[2]).toMatchObject({ order: { shop: "Sweet Treats Bakery", price: 1140 }, verified: true });
    expect(run.events.at(-1)!.title).toBe("All 3 things ordered · ₹1,620 of ₹5,000");
  });

  test("EXPIRY: nobody answers → the task is skipped, never ordered, and the run still finishes", async () => {
    const store = await make(); const runId = await setup(store);
    await runExecutor(runId, { llm: until(firstPart), store, now: NOW, sleep: noWait });
    const [a] = await store.listApprovals({ status: "pending" });
    expect(await store.expireApprovals(new Date(new Date(a.expiresAt).getTime() - 1000))).toEqual([]);  // not yet
    const [expired] = await store.expireApprovals(new Date(new Date(a.expiresAt).getTime() + 1000));
    expect(expired.status).toBe("expired");
    const llm = until([
      (input) => (expect(last(input).content).toMatch(/Nobody answered in time, so t3 is skipped/), [call("place_order", { taskId: "t3", shop: "Cake Corner" })]),
      (input) => (expect(out(input).error).toMatch(/t3 was skipped/), [msg("The rest is ordered.")]),
    ]);
    await runExecutor(runId, { llm, store, answer: expired, now: NOW, sleep: noWait });
    const run = (await store.getRun(runId))!;
    expect(run.status).toBe("done");
    expect(run.events.at(-1)!.title).toBe("2 of 3 ordered · 1 skipped (no answer)");
    expect((await store.listTasks())[2]).toMatchObject({ order: null, skipped: true });
  });

  test("GRANT: 'yes to similar' lets the next cake under the price through, and says so", async () => {
    const store = await make(); const runId = await setup(store, [{ ref: "t1", kind: "cake", cost: 1200 }, { ref: "t2", kind: "cake", cost: 1100 }]);
    await runExecutor(runId, { llm: until([[call("place_order", { taskId: "t1", shop: "Sweet Treats Bakery" })]]), store, now: NOW, sleep: noWait });
    const [a] = await store.listApprovals({ status: "pending" });
    await store.addGrant({ kind: "cake", maxPrice: a.price, expiresAt: "2026-11-10T00:00:00Z" });
    const answer = (await store.decideApproval(a.id, "approved", ""))!;
    await runExecutor(runId, { llm: until([[call("place_order", { taskId: "t2", shop: "Sweet Treats Bakery" })], [msg("Both cakes ordered.")]]), store, answer, now: NOW, sleep: noWait });
    const run = (await store.getRun(runId))!;
    expect(run.status).toBe("done");
    expect(run.events.some((e) => e.title === "Allowed by your earlier OK" && e.detail.startsWith("t2"))).toBe(true);
    expect(await store.listApprovals({ status: "pending" })).toEqual([]);
    expect((await store.listGrants(new Date("2026-11-11T00:00:00Z"))).length).toBe(0);   // gone after it expires
  });
});

describe("API", () => {
  test("rules, answers, grants", async () => {
    const store = memoryStore(); const app = createApp({ llm: scripted([[msg("Done.")]]), store });
    expect((await request(app).get("/api/policy").expect(200)).body.policy).toEqual({ maxAuto: 1000, alwaysAsk: [] });
    await request(app).put("/api/policy").send({ maxAuto: "lots" }).expect(400);
    expect((await request(app).put("/api/policy").send({ maxAuto: 1500, alwaysAsk: ["gift"] }).expect(200)).body.policy).toEqual({ maxAuto: 1500, alwaysAsk: ["gift"] });

    const runId = await setup(store);
    await runExecutor(runId, { llm: until(firstPart), store, now: NOW, sleep: noWait });
    const [a] = (await request(app).get("/api/approvals?status=pending").expect(200)).body.approvals;
    await request(app).post(`/api/approvals/${a.id}/decide`).send({ decision: "maybe" }).expect(400);
    await request(app).post(`/api/approvals/${a.id}/decide`).send({ decision: "approve", similar: true }).expect(200);
    await request(app).post(`/api/approvals/${a.id}/decide`).send({ decision: "reject" }).expect(409);
    const { grants } = (await request(app).get("/api/grants").expect(200)).body;
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ kind: "cake", maxPrice: 1140 });
    await request(app).delete(`/api/grants/${grants[0].id}`).expect(200);
    await new Promise((r) => setTimeout(r, 30));
    expect((await store.getRun(runId))!.status).toBe("done");
  });

  test("the sweeper expires old questions and continues their runs", async () => {
    const store = memoryStore(); const runId = await setup(store);
    await runExecutor(runId, { llm: until(firstPart), store, now: NOW, sleep: noWait });
    const llm = scripted([[msg("Rest done.")]]);
    expect(await sweep({ llm, store }, new Date(Date.now() + 10 * 60_000))).toBe(1);
    await new Promise((r) => setTimeout(r, 30));
    expect((await store.getRun(runId))!.status).toBe("done");
    expect((await store.listTasks())[2].skipped).toBe(true);
  });
});
