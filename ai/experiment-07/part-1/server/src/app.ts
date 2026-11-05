import cors from "cors";
import express from "express";
import { runAgent } from "./agent";
import type { LLM } from "./llm";
import type { Store } from "./types";

export function createApp(deps: { llm: LLM; store: Store }) {
  const { llm, store } = deps;
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "20kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, part: 1, model: process.env.AGENT_MODEL }));

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
    res.json({ id: run.id, goal: run.goal, status: run.status, events: run.events.filter((e) => e.seq > after) });
  });

  app.get("/api/tasks", async (_req, res) => res.json({ tasks: await store.listTasks() }));

  app.post("/api/tasks/:id/toggle", async (req, res) => {
    const task = await store.toggleTask(String(req.params.id));
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json({ task });
  });

  return app;
}
