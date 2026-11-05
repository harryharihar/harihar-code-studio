// Part 1: the few types the whole experiment is built on.

// The four beats of an agent, plus the start and the end. The phone draws one chip per event.
export type EventKind = "goal" | "plan" | "act" | "observe" | "decide" | "final" | "error";

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
}
