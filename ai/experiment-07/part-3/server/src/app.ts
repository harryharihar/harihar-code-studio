import cors from "cors";
import express from "express";
import { runAgent } from "./agent";
import { BUDGET, runExecutor } from "./execute";
import type { LLM } from "./llm";
import { optionsFor, spent } from "./shops";
import { dateOf, runPlanner } from "./plan";
import type { Store } from "./types";

export function createApp(deps: { llm: LLM; store: Store }) {
  const { llm, store } = deps;
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "20kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, part: 3, model: process.env.AGENT_MODEL }));

  // Start a run. We answer at once with the run id, and the agent keeps working in the background.
  app.post("/api/runs", async (req, res) => {
    const goal = typeof req.body?.goal === "string" ? req.body.goal.trim().slice(0, 600) : "";
    if (goal.length < 5) return res.status(400).json({ error: "Tell me your goal first." });
    const run = await store.createRun(goal);
    runAgent(run.id, goal, { llm, store }).catch(async (e) => {
      await store.addEvent(run.id, "error", "Agent stopped", e instanceof Error ? e.message : String(e));
      await store.setStatus(run.id, "failed");
    });
    res.status(202).json({ id: run.id });
  });

  // The phone asks every second: anything new after the last event I saw?
  app.get("/api/runs/:id", async (req, res) => {
    const run = await store.getRun(String(req.params.id));
    if (!run) return res.status(404).json({ error: "Run not found." });
    const after = Number(req.query.after ?? 0) || 0;
    res.json({ id: run.id, goal: run.goal, status: run.status, usage: run.usage, budget: BUDGET, events: run.events.filter((e) => e.seq > after) });
  });

  // Part 2: make a plan in the background. Nothing goes on the calendar yet.
  app.post("/api/plans", async (req, res) => {
    const goal = typeof req.body?.goal === "string" ? req.body.goal.trim().slice(0, 600) : "";
    if (goal.length < 5) return res.status(400).json({ error: "Tell me your goal first." });
    const run = await store.createRun(goal);
    runPlanner(run.id, goal, { llm, store }).catch(async (e) => {
      await store.addEvent(run.id, "error", "Planner stopped", e instanceof Error ? e.message : String(e));
      await store.setStatus(run.id, "failed");
    });
    res.status(202).json({ id: run.id });
  });

  // The phone asks every second: anything new? When it is done, the plan comes along too.
  app.get("/api/plans/:id", async (req, res) => {
    const id = String(req.params.id);
    const run = await store.getRun(id);
    if (!run) return res.status(404).json({ error: "Plan not found." });
    const after = Number(req.query.after ?? 0) || 0;
    res.json({ id, goal: run.goal, status: run.status, events: run.events.filter((e) => e.seq > after), result: (await store.getPlan(id)) ?? null });
  });

  // The user said yes: this plan becomes the task list (in dependency order) and its budget is set.
  app.post("/api/plans/:id/accept", async (req, res) => {
    const stored = await store.getPlan(String(req.params.id));
    if (!stored) return res.status(404).json({ error: "Plan not found." });
    if (stored.accepted) return res.status(409).json({ error: "This plan is already accepted." });
    await store.clearTasks(); // one plan at a time: the new plan replaces the old one
    for (const id of stored.order) {
      const t = stored.plan.tasks.find((x) => x.id === id)!;
      await store.addTask({ runId: stored.id, title: t.title, day: dateOf(t.day), notes: t.why, ref: t.id, dependsOn: t.dependsOn, kind: t.kind, cost: t.cost });
    }
    await store.setBudget(stored.plan.budget);
    await store.markAccepted(stored.id);
    res.json({ tasks: await store.listTasks() });
  });

  // Part 3: the executor orders every task of the accepted plan from a shop, in the background.
  // { flaky: true } is practice mode: the shops fail on purpose, to show retry and verify.
  // { fresh: true } clears all orders first, so a run can be repeated.
  app.post("/api/execute", async (req, res) => {
    let tasks = await store.listTasks();
    if (tasks.length === 0) return res.status(400).json({ error: "Accept a plan first." });
    if (req.body?.fresh === true) for (const t of tasks) await store.updateTask(t.id, { order: null, verified: false });
    tasks = await store.listTasks();
    if (tasks.every((t) => t.order)) return res.status(409).json({ error: "Everything is already ordered." });
    const run = await store.createRun("Order everything in my accepted plan.");
    runExecutor(run.id, { llm, store, flaky: req.body?.flaky === true }).catch(async (e) => {
      await store.addEvent(run.id, "error", "Executor stopped", e instanceof Error ? e.message : String(e));
      await store.setStatus(run.id, "failed");
    });
    res.status(202).json({ id: run.id });
  });

  // The party: the budget, what was spent, every order (with its shop and price) and what still waits.
  app.get("/api/party", async (_req, res) => {
    const tasks = await store.listTasks();
    const budget = await store.getBudget();
    res.json({
      budget,
      spent: spent(tasks),
      day: tasks.reduce((d, t) => (t.day > d ? t.day : d), ""),
      items: tasks.map((t) => ({ id: t.id, ref: t.ref, title: t.title, kind: t.kind, day: t.day, cost: t.cost, order: t.order, verified: t.verified, options: optionsFor(t).length })),
    });
  });

  app.get("/api/tasks", async (_req, res) => res.json({ tasks: await store.listTasks() }));

  app.post("/api/tasks/:id/toggle", async (req, res) => {
    const task = await store.toggleTask(String(req.params.id));
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json({ task });
  });

  return app;
}
