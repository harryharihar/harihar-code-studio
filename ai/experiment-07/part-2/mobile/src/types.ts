export type EventKind = "goal" | "ask" | "check" | "repair" | "order" | "final" | "error";
export type RunEvent = { seq: number; at: string; kind: EventKind; title: string; detail: string };
export type Status = "running" | "done" | "failed";
export type Task = { id: string; runId: string; title: string; day: string; minutes: number; notes: string; done: boolean };

// Part 2: the plan the AI made. Same shape as the Zod schema on the server.
export type PlanTask = { id: string; title: string; why: string; day: number; minutes: number; priority: "high" | "normal" | "low"; kind: "learn" | "practice" | "mock" | "review" | "rest"; dependsOn: string[] };
export type Plan = { goal: string; summary: string; days: number; tasks: PlanTask[] };
export type PlanResult = { id: string; plan: Plan; order: string[]; fixed: string[]; accepted: boolean };
export type PlanRun = { id: string; goal: string; status: Status; events: RunEvent[]; result: PlanResult | null };
