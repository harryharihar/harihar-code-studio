// The few types the whole experiment is built on. Part 2 adds the planner's steps and a stored plan.
import type { Plan } from "./schemas";

// The four beats of an agent, plus the start and the end. The phone draws one chip per event.
export type EventKind = "goal" | "plan" | "act" | "observe" | "decide" | "ask" | "check" | "repair" | "order" | "final" | "error";

export type RunEvent = { seq: number; at: string; kind: EventKind; title: string; detail: string };

export type Run = {
  id: string;
  goal: string;
  status: "running" | "done" | "failed";
  events: RunEvent[];
};

// One thing on the user's calendar. The agent creates these with a tool.
export type Task = {
  id: string;
  runId: string;
  title: string;
  day: string; // YYYY-MM-DD
  minutes: number;
  notes: string;
  done: boolean;
};

// A plan the AI made, waiting for the user's yes. Its id is the id of the run that made it.
export type StoredPlan = { id: string; plan: Plan; order: string[]; fixed: string[]; accepted: boolean };

// Anything the agent needs to read or write lives behind this small interface.
// Part 1 keeps it in memory. In Part 4 we swap in PostgreSQL without touching the agent.
export interface Store {
  createRun(goal: string): Promise<Run>;
  getRun(id: string): Promise<Run | undefined>;
  setStatus(id: string, status: Run["status"]): Promise<void>;
  addEvent(id: string, kind: EventKind, title: string, detail?: string): Promise<RunEvent>;
  addTask(t: Omit<Task, "id" | "done">): Promise<Task>;
  listTasks(): Promise<Task[]>;
  toggleTask(id: string): Promise<Task | undefined>;
  clearTasks(): Promise<void>;
  savePlan(p: StoredPlan): Promise<StoredPlan>;
  getPlan(id: string): Promise<StoredPlan | undefined>;
  markAccepted(id: string): Promise<void>;
}
