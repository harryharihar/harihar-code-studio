export type EventKind = "goal" | "plan" | "act" | "observe" | "decide" | "final" | "error";
export type RunEvent = { seq: number; at: string; kind: EventKind; title: string; detail: string };
export type Run = { id: string; goal: string; status: "running" | "done" | "failed" };
export type Task = { id: string; runId: string; title: string; day: string; minutes: number; notes: string; done: boolean };
