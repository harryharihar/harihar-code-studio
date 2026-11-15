import cors from "cors";
import express from "express";
import { runAgent } from "./agent";
import { BUDGET, runExecutor } from "./execute";
import type { LLM } from "./llm";
import { optionsFor, spent } from "./shops";
import { dateOf, runPlanner } from "./plan";
import { APPROVAL_TTL_S, endOfDay, validPolicy } from "./policy";
import { createMail } from "./mail";
import type { Approval, Store } from "./types";

// Recording only: DEMO_PACE_MS=4000 in .env waits 4 s after every checked order. 0 (the default) = full speed.
const PACE = Number(process.env.DEMO_PACE_MS || 0);

// Part 5: an answer (or the clock) starts a waiting run again, from its checkpoint.
export function continueRun(a: Approval, deps: { llm: LLM; store: Store }) {
  return runExecutor(a.runId, { llm: deps.llm, store: deps.store, answer: a, pace: PACE }).catch(async (e) => {
    await deps.store.addEvent(a.runId, "error", "Executor stopped", e instanceof Error ? e.message : String(e));
    await deps.store.setStatus(a.runId, "failed");
  });
}

// Part 5: questions nobody answered in time expire. The agent then skips that task: never ordered without you.
export async function sweep(deps: { llm: LLM; store: Store }, now = new Date()) {
  const out = await deps.store.expireApprovals(now);
  for (const a of out) await continueRun(a, deps);
  return out.length;
}

export function createApp(deps: { llm: LLM; store: Store; db?: "postgres" | "memory"; sweepEveryMs?: number }) {
  const { llm, store } = deps;
  if (deps.sweepEveryMs) setInterval(() => sweep({ llm, store }).catch(() => {}), deps.sweepEveryMs).unref();
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "20kb" }));

  // Part 5: the email agent (the demo in the video).
  app.use(createMail({ llm, ttlS: APPROVAL_TTL_S, paceMs: Number(process.env.MAIL_PACE_MS ?? 1500), fake: process.env.MAIL_FAKE === "1" }));

  app.get("/health", (_req, res) => res.json({ ok: true, part: 5, store: deps.db ?? "memory", model: process.env.AGENT_MODEL }));

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
    res.json({ id: run.id, kind: run.kind, goal: run.goal, status: run.status, usage: run.usage, budget: BUDGET, events: run.events.filter((e) => e.seq > after) });
  });

  // Part 2: make a plan in the background. Nothing goes on the calendar yet.
  app.post("/api/plans", async (req, res) => {
    const goal = typeof req.body?.goal === "string" ? req.body.goal.trim().slice(0, 600) : "";
    if (goal.length < 5) return res.status(400).json({ error: "Tell me your goal first." });
    const run = await store.createRun(goal, "plan");
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
    if (req.body?.fresh === true) for (const t of tasks) await store.updateTask(t.id, { order: null, verified: false, skipped: false });
    tasks = await store.listTasks();
    if (tasks.every((t) => t.order || t.skipped)) return res.status(409).json({ error: "Everything is already ordered." });
    const run = await store.createRun("Order everything in my accepted plan.", "execute");
    runExecutor(run.id, { llm, store, flaky: req.body?.flaky === true, pace: PACE }).catch(async (e) => {
      await store.addEvent(run.id, "error", "Executor stopped", e instanceof Error ? e.message : String(e));
      await store.setStatus(run.id, "failed");
    });
    res.status(202).json({ id: run.id });
  });

  // The party: the budget, what was spent, every order (with its shop and price) and what still waits.
  app.get("/api/party", async (_req, res) => {  // Part 5: items also say if they were skipped
    const tasks = await store.listTasks();
    const budget = await store.getBudget();
    res.json({
      budget,
      spent: spent(tasks),
      day: tasks.reduce((d, t) => (t.day > d ? t.day : d), ""),
      items: tasks.map((t) => ({ id: t.id, ref: t.ref, title: t.title, kind: t.kind, day: t.day, cost: t.cost, order: t.order, verified: t.verified, skipped: t.skipped, options: optionsFor(t).length, choices: optionsFor(t) })), // Part 5: the shops, for the live cart
    });
  });

  // ─── Part 4: history, resume, memory ───────────────────────────────────────────────────────────

  // Every run, newest first. It comes from the database, so it survives a restart.
  app.get("/api/runs", async (_req, res) => res.json({ runs: await store.listRuns(30) }));

  // Resume: the same executor, the same run id, started again from its last checkpoint.
  app.post("/api/runs/:id/resume", async (req, res) => {
    const run = await store.getRun(String(req.params.id));
    if (!run) return res.status(404).json({ error: "Run not found." });
    if (run.status !== "interrupted") return res.status(409).json({ error: `This run is ${run.status}, not interrupted.` });
    if (run.kind !== "execute") return res.status(409).json({ error: "Only an ordering run can be resumed. Make the plan again." });
    runExecutor(run.id, { llm, store, resume: true, pace: PACE }).catch(async (e) => {
      await store.addEvent(run.id, "error", "Executor stopped", e instanceof Error ? e.message : String(e));
      await store.setStatus(run.id, "failed");
    });
    res.status(202).json({ id: run.id });
  });

  // Long-term memory: read it, add a note by hand, delete a note. The user is in control.
  app.get("/api/memory", async (_req, res) => res.json({ notes: await store.listNotes() }));
  app.post("/api/memory", async (req, res) => {
    const content = typeof req.body?.content === "string" ? req.body.content.trim().slice(0, 120) : "";
    if (content.length < 4) return res.status(400).json({ error: "Write a short note first." });
    const note = await store.addNote(content);
    if (!note) return res.status(409).json({ error: "I already remember that." });
    res.status(201).json({ note });
  });
  app.delete("/api/memory/:id", async (req, res) => {
    if (!(await store.deleteNote(String(req.params.id)))) return res.status(404).json({ error: "Note not found." });
    res.json({ ok: true });
  });

  // ─── Part 5: your rules, the questions, and "yes to similar" ─────────────────────────────────

  app.get("/api/policy", async (_req, res) => res.json({ policy: await store.getPolicy() }));
  app.put("/api/policy", async (req, res) => {
    const p = validPolicy(req.body);
    if (!p) return res.status(400).json({ error: "The limit must be a whole number of rupees, 0 to 5,00,000." });
    res.json({ policy: await store.setPolicy(p) });
  });

  app.get("/api/approvals", async (req, res) => {
    const st = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
    res.json({ approvals: await store.listApprovals(st ? { status: st } : {}), now: new Date().toISOString() });
  });

  // Your answer. Only an open question can be answered, and its run must be waiting for it.
  app.post("/api/approvals/:id/decide", async (req, res) => {
    const decision = req.body?.decision;
    if (decision !== "approve" && decision !== "reject") return res.status(400).json({ error: "Say approve or reject." });
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 140) : "";
    const a = await store.decideApproval(String(req.params.id), decision === "approve" ? "approved" : "rejected", note);
    if (!a) return res.status(409).json({ error: "This question is already answered or expired." });
    // "Yes to similar today": the same kind, up to this price, until midnight
    if (decision === "approve" && req.body?.similar === true) await store.addGrant({ kind: a.kind, maxPrice: a.price, expiresAt: endOfDay().toISOString() });
    continueRun(a, { llm, store });
    res.json({ approval: a });
  });

  app.get("/api/grants", async (_req, res) => res.json({ grants: await store.listGrants(new Date()) }));
  app.delete("/api/grants/:id", async (req, res) => {
    if (!(await store.deleteGrant(String(req.params.id)))) return res.status(404).json({ error: "Grant not found." });
    res.json({ ok: true });
  });

  app.get("/api/tasks", async (_req, res) => res.json({ tasks: await store.listTasks() }));

  app.post("/api/tasks/:id/toggle", async (req, res) => {
    const task = await store.toggleTask(String(req.params.id));
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json({ task });
  });

  return app;
}
