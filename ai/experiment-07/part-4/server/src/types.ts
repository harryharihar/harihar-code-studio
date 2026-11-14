// The few types the whole experiment is built on.
// Part 2 added the planner's steps and a stored plan. Part 3 adds the execution loop: times, checks, budgets.
// Part 4 adds memory and state: every run, order and note is kept in PostgreSQL, so a restart loses nothing.
import type { Plan } from "./schemas";

// One chip per event on the phone.
// Part 1: plan · act · observe · decide.  Part 2: ask · check · repair · order.
// Part 3: think · act · observe · retry · verify · guard · budget.  Part 4: memory · resume.
export type EventKind =
  | "goal" | "plan" | "act" | "observe" | "decide"
  | "ask" | "check" | "repair" | "order"
  | "think" | "retry" | "verify" | "guard" | "budget"
  | "memory" | "resume"
  | "final" | "error";

export type RunEvent = { seq: number; at: string; kind: EventKind; title: string; detail: string };

// What a run has spent so far. The phone draws these as three meters.
export type Usage = { steps: number; tokens: number; seconds: number };

// Part 4: "interrupted" = it was running when the server stopped. Only Resume can continue it.
export type RunStatus = "running" | "done" | "failed" | "interrupted";
export type RunKind = "agent" | "plan" | "execute";

export type Run = {
  id: string;
  kind: RunKind;
  goal: string;
  status: RunStatus;
  events: RunEvent[];
  usage: Usage;
  createdAt: string;
};

// One line in the History tab.
export type RunSummary = { id: string; kind: RunKind; goal: string; status: RunStatus; createdAt: string; last: string };

// Part 4: the CHECKPOINT. The executor's short-term memory (its whole conversation with the model)
// and what it has spent, saved after every finished step. Resume starts from here.
export type Checkpoint = { input: any[]; usage: Usage };

// Part 4: LONG-TERM memory. One short note about the user, kept for every future plan.
export type Note = { id: string; content: string; createdAt: string };

// One thing to get done. Part 1 used minutes; from Part 3 on, a task is something to order, with a price.
export type Task = {
  id: string;
  runId: string;
  title: string;
  day: string; // YYYY-MM-DD: the day it must be done by
  minutes: number; // Part 1 only
  notes: string;
  done: boolean;
  // Part 3: the order the agent places for it
  ref: string; // the plan's own id: "t1", "t2" …
  dependsOn: string[]; // refs that must be ordered before this one
  kind: Kind;
  cost: number; // the plan's estimate, in rupees
  order: Order | null; // null until the agent orders it
  verified: boolean; // true only after our code found it in the shop's order list
};

export type Kind = "cake" | "food" | "decor" | "gift" | "invite" | "travel" | "other";

// What the agent bought: which shop, what, for how much, and when it arrives.
export type Order = { id: string; shop: string; item: string; price: number; eta: string };

// A plan the AI made, waiting for the user's yes. Its id is the id of the run that made it.
// Part 4: notes = the memory notes the planner read for this plan.
export type StoredPlan = { id: string; plan: Plan; order: string[]; fixed: string[]; accepted: boolean; notes: string[] };

// Anything the agent needs to read or write lives behind this small interface.
// Part 4: there are two of them, memoryStore (for tests) and pgStore (PostgreSQL). The agent cannot tell them apart.
export interface Store {
  createRun(goal: string, kind?: RunKind): Promise<Run>;
  getRun(id: string): Promise<Run | undefined>;
  setStatus(id: string, status: RunStatus): Promise<void>;
  setUsage(id: string, usage: Usage): Promise<void>;
  addEvent(id: string, kind: EventKind, title: string, detail?: string): Promise<RunEvent>;
  addTask(t: Pick<Task, "runId" | "title" | "day" | "notes"> & Partial<Pick<Task, "minutes" | "ref" | "dependsOn" | "kind" | "cost">>): Promise<Task>;
  listTasks(): Promise<Task[]>;
  updateTask(id: string, patch: Partial<Pick<Task, "day" | "order" | "verified">>): Promise<Task | undefined>;
  // Part 3: the money the user gave the agent for this plan, in rupees
  setBudget(rupees: number): Promise<void>;
  getBudget(): Promise<number>;
  toggleTask(id: string): Promise<Task | undefined>;
  clearTasks(): Promise<void>;
  savePlan(p: StoredPlan): Promise<StoredPlan>;
  getPlan(id: string): Promise<StoredPlan | undefined>;
  markAccepted(id: string): Promise<void>;
  // Part 4: history, checkpoint and resume
  listRuns(limit?: number): Promise<RunSummary[]>;
  markInterrupted(): Promise<number>; // on startup: every run still "running" never finished
  saveCheckpoint(runId: string, cp: Checkpoint): Promise<void>;
  loadCheckpoint(runId: string): Promise<Checkpoint | undefined>;
  // Part 4: long-term memory
  addNote(content: string): Promise<Note | null>; // null = already remembered
  listNotes(): Promise<Note[]>;
  deleteNote(id: string): Promise<boolean>;
}
