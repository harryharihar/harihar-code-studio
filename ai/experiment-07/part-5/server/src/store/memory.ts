import { randomUUID } from "node:crypto";
import type { Approval, Checkpoint, EventKind, Grant, Note, Policy, Run, RunEvent, Store, StoredPlan, Task } from "../types";
import { DEFAULT_POLICY } from "../policy";

// Everything lives in the server's memory. Restart the server and it is all gone.
// Part 4 keeps it for the tests: the same tests run on this store and on PostgreSQL.
export function memoryStore(): Store {
  const runs = new Map<string, Run>();
  const checkpoints = new Map<string, Checkpoint>();
  let tasks: Task[] = [];
  let budget = 0;
  const plans = new Map<string, StoredPlan>();
  let notes: Note[] = [];
  let policy: Policy = { ...DEFAULT_POLICY };
  let approvals: Approval[] = [];
  let grants: Grant[] = [];
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)); // what a database would hand back: a copy, never the live object

  return {
    async createRun(goal, kind = "agent") {
      const run: Run = { id: randomUUID(), kind, goal, status: "running", events: [], usage: { steps: 0, tokens: 0, seconds: 0 }, createdAt: new Date().toISOString() };
      runs.set(run.id, run);
      return copy(run);
    },
    async getRun(id) {
      const run = runs.get(id);
      return run && copy(run);
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
      const task: Task = { minutes: 0, ref: "", dependsOn: [], kind: "other", cost: 0, ...t, id: randomUUID(), done: false, order: null, verified: false, skipped: false };
      tasks.push(task);
      return copy(task);
    },
    async listTasks() {
      return copy(tasks); // the plan's order: dependencies first
    },
    async updateTask(id, patch) {
      const task = tasks.find((t) => t.id === id);
      if (task) Object.assign(task, copy(patch));
      return task && copy(task);
    },
    async toggleTask(id) {
      const task = tasks.find((t) => t.id === id);
      if (task) task.done = !task.done;
      return task && copy(task);
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
      plans.set(p.id, copy(p));
      return p;
    },
    async getPlan(id) {
      const p = plans.get(id);
      return p && copy(p);
    },
    async markAccepted(id) {
      const p = plans.get(id);
      if (p) p.accepted = true;
    },

    // ─── Part 4 ───
    async listRuns(limit = 20) {
      return [...runs.values()]
        .reverse()
        .slice(0, limit)
        .map((r) => ({ id: r.id, kind: r.kind, goal: r.goal, status: r.status, createdAt: r.createdAt, last: r.events.at(-1)?.title ?? "" }));
    },
    async markInterrupted() {
      let n = 0;
      for (const r of runs.values()) if (r.status === "running") (r.status = "interrupted"), n++;
      return n;
    },
    async saveCheckpoint(runId, cp) {
      checkpoints.set(runId, copy(cp));
    },
    async loadCheckpoint(runId) {
      const cp = checkpoints.get(runId);
      return cp && copy(cp);
    },
    async addNote(content) {
      if (notes.some((n) => n.content.toLowerCase() === content.toLowerCase())) return null;
      const note: Note = { id: randomUUID(), content, createdAt: new Date().toISOString() };
      notes.push(note);
      return note;
    },
    async listNotes() {
      return copy(notes);
    },
    async deleteNote(id) {
      const before = notes.length;
      notes = notes.filter((n) => n.id !== id);
      return notes.length < before;
    },

    // ─── Part 5 ───
    async getPolicy() {
      return copy(policy);
    },
    async setPolicy(p) {
      policy = copy(p);
      return copy(policy);
    },
    async addApproval(a) {
      const x: Approval = { ...a, id: randomUUID(), status: "pending", note: "", createdAt: new Date().toISOString(), decidedAt: null };
      approvals.push(x);
      return copy(x);
    },
    async getApproval(id) {
      const x = approvals.find((a) => a.id === id);
      return x && copy(x);
    },
    async listApprovals(f = {}) {
      return copy(approvals.filter((a) => (!f.status || a.status === f.status) && (!f.runId || a.runId === f.runId)).reverse());
    },
    async decideApproval(id, status, note) {
      const x = approvals.find((a) => a.id === id && a.status === "pending");
      if (!x) return undefined;
      Object.assign(x, { status, note, decidedAt: new Date().toISOString() });
      return copy(x);
    },
    async expireApprovals(now) {
      const out = approvals.filter((a) => a.status === "pending" && new Date(a.expiresAt) <= now);
      for (const a of out) Object.assign(a, { status: "expired", decidedAt: now.toISOString() });
      return copy(out);
    },
    async addGrant(g) {
      const x: Grant = { ...g, id: randomUUID(), createdAt: new Date().toISOString() };
      grants.push(x);
      return copy(x);
    },
    async listGrants(now) {
      return copy(grants.filter((g) => new Date(g.expiresAt) > now));
    },
    async deleteGrant(id) {
      const before = grants.length;
      grants = grants.filter((g) => g.id !== id);
      return grants.length < before;
    },
  };
}
