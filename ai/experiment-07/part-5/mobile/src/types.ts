export type EventKind =
  | "goal" | "ask" | "check" | "repair" | "order"
  | "think" | "act" | "observe" | "retry" | "verify" | "guard" | "budget"
  | "memory" | "resume"
  | "approval"
  | "final" | "error";
export type RunEvent = { seq: number; at: string; kind: EventKind; title: string; detail: string };
// Part 4: "interrupted" = the server stopped while it was running. Resume continues it.
export type Status = "running" | "done" | "failed" | "interrupted" | "waiting"; // Part 5: waiting = paused for your OK
export type Kind = "cake" | "food" | "decor" | "gift" | "invite" | "travel" | "flight" | "stay" | "audio" | "camera" | "light" | "gear" | "other";
export type Order = { id: string; shop: string; item: string; price: number; eta: string };
export type Task = { id: string; runId: string; title: string; day: string; notes: string; done: boolean; ref: string; dependsOn: string[]; kind: Kind; cost: number; order: Order | null; verified: boolean };

// Part 2: the plan the AI made. Same shape as the Zod schema on the server.
export type PlanTask = { id: string; title: string; why: string; day: number; cost: number; priority: "high" | "normal" | "low"; kind: Kind; dependsOn: string[] };
export type Plan = { goal: string; summary: string; days: number; budget: number; tasks: PlanTask[] };
export type PlanResult = { id: string; plan: Plan; order: string[]; fixed: string[]; accepted: boolean; notes: string[] };
export type PlanRun = { id: string; goal: string; status: Status; events: RunEvent[]; result: PlanResult | null };

// Part 3: an execution run, what it spent, and the party it ordered.
export type Usage = { steps: number; tokens: number; seconds: number };
export type ExecRun = { id: string; kind: RunKind; status: Status; events: RunEvent[]; usage: Usage; budget: Usage };
export type PartyItem = { id: string; ref: string; title: string; kind: Kind; day: string; cost: number; order: Order | null; verified: boolean; skipped?: boolean; choices?: { shop: string; item: string; price: number; rating: number }[] };
export type Party = { budget: number; spent: number; day: string; items: PartyItem[] };

// Part 4: history and long-term memory, both saved in PostgreSQL.
export type RunKind = "agent" | "plan" | "execute";
export type RunSummary = { id: string; kind: RunKind; goal: string; status: Status; createdAt: string; last: string };
export type Note = { id: string; content: string; createdAt: string };

// Part 5: the human in the loop.
export type Policy = { maxAuto: number; alwaysAsk: Kind[] };
export type Approval = {
  id: string; runId: string; taskRef: string; taskTitle: string; kind: Kind; shop: string; item: string; price: number;
  reason: string; status: "pending" | "approved" | "rejected" | "expired"; note: string; createdAt: string; decidedAt: string | null; expiresAt: string;
};
export type Grant = { id: string; kind: Kind | null; maxPrice: number; expiresAt: string; createdAt: string };
