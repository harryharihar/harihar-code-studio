export type EventKind =
  | "goal" | "ask" | "check" | "repair" | "order"
  | "think" | "act" | "observe" | "retry" | "verify" | "guard" | "budget"
  | "final" | "error";
export type RunEvent = { seq: number; at: string; kind: EventKind; title: string; detail: string };
export type Status = "running" | "done" | "failed";
export type Kind = "cake" | "food" | "decor" | "gift" | "invite" | "travel" | "other";
export type Order = { id: string; shop: string; item: string; price: number; eta: string };
export type Task = { id: string; runId: string; title: string; day: string; notes: string; done: boolean; ref: string; dependsOn: string[]; kind: Kind; cost: number; order: Order | null; verified: boolean };

// Part 2: the plan the AI made. Same shape as the Zod schema on the server.
export type PlanTask = { id: string; title: string; why: string; day: number; cost: number; priority: "high" | "normal" | "low"; kind: Kind; dependsOn: string[] };
export type Plan = { goal: string; summary: string; days: number; budget: number; tasks: PlanTask[] };
export type PlanResult = { id: string; plan: Plan; order: string[]; fixed: string[]; accepted: boolean };
export type PlanRun = { id: string; goal: string; status: Status; events: RunEvent[]; result: PlanResult | null };

// Part 3: an execution run, what it spent, and the party it ordered.
export type Usage = { steps: number; tokens: number; seconds: number };
export type ExecRun = { id: string; status: Status; events: RunEvent[]; usage: Usage; budget: Usage };
export type PartyItem = { id: string; ref: string; title: string; kind: Kind; day: string; cost: number; order: Order | null; verified: boolean };
export type Party = { budget: number; spent: number; day: string; items: PartyItem[] };
