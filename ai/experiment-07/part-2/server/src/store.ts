import { randomUUID } from "node:crypto";
import type { EventKind, Run, RunEvent, Store, StoredPlan, Task } from "./types";

// Everything lives in memory. Restart the server and it is gone (Part 4 fixes that).
export function memoryStore(): Store {
  const runs = new Map<string, Run>();
  let tasks: Task[] = [];
  const plans = new Map<string, StoredPlan>();

  return {
    async createRun(goal) {
      const run: Run = { id: randomUUID(), goal, status: "running", events: [] };
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
    async addEvent(id, kind: EventKind, title, detail = "") {
      const run = runs.get(id)!;
      const ev: RunEvent = { seq: run.events.length + 1, at: new Date().toISOString(), kind, title, detail };
      run.events.push(ev);
      return ev;
    },
    async addTask(t) {
      const task: Task = { ...t, id: randomUUID(), done: false };
      tasks.push(task);
      return task;
    },
    async listTasks() {
      return [...tasks].sort((a, b) => a.day.localeCompare(b.day));
    },
    async toggleTask(id) {
      const task = tasks.find((t) => t.id === id);
      if (task) task.done = !task.done;
      return task;
    },
    async clearTasks() {
      tasks = [];
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
