// The few types the whole experiment is built on.
// Part 2 added the planner's steps and a stored plan. Part 3 adds the execution loop: times, checks, budgets.
import type { Plan } from "./schemas";

// One chip per event on the phone.
// Part 1: plan · act · observe · decide.  Part 2: ask · check · repair · order.
// Part 3: think · act · observe · retry · verify · guard · budget.
export type EventKind =
  | "goal" | "plan" | "act" | "observe" | "decide"
  | "ask" | "check" | "repair" | "order"
  | "think" | "retry" | "verify" | "guard" | "budget"
  | "final" | "error";

export type RunEvent = { seq: number; at: string; kind: EventKind; title: string; detail: string };

// What a run has spent so far. The phone draws these as three meters.
export type Usage = { steps: number; tokens: number; seconds: number };

export type Run = {
  id: string;
  goal: string;
  status: "running" | "done" | "failed";
  events: RunEvent[];
  usage: Usage;
};

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
export type StoredPlan = { id: string; plan: Plan; order: string[]; fixed: string[]; accepted: boolean };

// Anything the agent needs to read or write lives behind this small interface.
// It is kept in memory for now. In Part 4 we swap in PostgreSQL without touching the agent.
export interface Store {
  createRun(goal: string): Promise<Run>;
  getRun(id: string): Promise<Run | undefined>;
  setStatus(id: string, status: Run["status"]): Promise<void>;
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
}
