import { randomUUID } from "node:crypto";
import type { EventKind, Run, RunEvent, Store, StoredPlan, Task } from "./types";

// Everything lives in memory. Restart the server and it is gone (Part 4 fixes that).
export function memoryStore(): Store {
  const runs = new Map<string, Run>();
  let tasks: Task[] = [];
  let budget = 0;
  const plans = new Map<string, StoredPlan>();

  return {
    async createRun(goal) {
      const run: Run = { id: randomUUID(), goal, status: "running", events: [], usage: { steps: 0, tokens: 0, seconds: 0 } };
      runs.set(run.id, run);
      return run;
    },
    async getRun(id) {
      return runs.get(id);
    },
    async setStatus(id, status) {
      const run = runs.get(id);
      if (run) run.status = status;
    },
    async setUsage(id, usage) {
      const run = runs.get(id);
      if (run) run.usage = { ...usage };
    },
    async addEvent(id, kind: EventKind, title, detail = "") {
      const run = runs.get(id)!;
      const ev: RunEvent = { seq: run.events.length + 1, at: new Date().toISOString(), kind, title, detail };
      run.events.push(ev);
      return ev;
    },
    async addTask(t) {
      const task: Task = { minutes: 0, ref: "", dependsOn: [], kind: "other", cost: 0, ...t, id: randomUUID(), done: false, order: null, verified: false };
      tasks.push(task);
      return task;
    },
    async listTasks() {
      return [...tasks]; // the plan's order: dependencies first
    },
    async updateTask(id, patch) {
      const task = tasks.find((t) => t.id === id);
      if (task) Object.assign(task, patch);
      return task;
    },
    async toggleTask(id) {
      const task = tasks.find((t) => t.id === id);
      if (task) task.done = !task.done;
      return task;
    },
    async clearTasks() {
      tasks = [];
    },
    async setBudget(rupees) {
      budget = rupees;
    },
    async getBudget() {
      return budget;
    },
    async savePlan(p) {
      plans.set(p.id, p);
      return p;
    },
    async getPlan(id) {
      return plans.get(id);
    },
    async markAccepted(id) {
      const p = plans.get(id);
      if (p) p.accepted = true;
    },
  };
}
