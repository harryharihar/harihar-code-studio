import { create } from "zustand";

// Part 6 demo: "A team of AI agents replies to my emails". The phone asks the server once a second.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3007";

export type Rules = { money: boolean; meeting: boolean; stranger: boolean };
export type Agent = "manager" | "sorter" | "writer" | "checker";
export type Who = Agent | "code" | "you";
export type Stage = "waiting" | "sorting" | "writing" | "checking" | "rules" | "asking" | "sent" | "no_reply" | "blocked" | "not_sent";
export type MailItem = {
  id: string; from: string; name: string; contact: boolean; noreply: boolean; subject: string; body: string;
  stage: Stage; label: string; why: string; reply: string; caught: string; hits: string[]; answer: string;
};
export type Question = { emailId: string; reply: string; hits: string[]; createdAt: string; expiresAt: string; round: number };
export type Msg = { at: string; emailId: string; from: Who; to: Who; kind: "task" | "result" | "problem" | "fixed" | "ok" | "ask" | "done"; text: string };
export type AgentState = { state: "idle" | "working" | "waiting"; doing: string };
export type Report = { sentAlone: number; sentWithOk: number; notSent: number; blocked: number; noReply: number; caught: number; summary: string };

const IDLE: Record<Agent, AgentState> = { manager: { state: "idle", doing: "" }, sorter: { state: "idle", doing: "" }, writer: { state: "idle", doing: "" }, checker: { state: "idle", doing: "" } };

type S = {
  items: MailItem[]; msgs: Msg[]; agents: Record<Agent, AgentState>; report: Report | null;
  rules: Rules; question: Question | null; running: boolean; skew: number; ttl: number; error: string | null;
  load: () => Promise<void>; start: () => Promise<void>; reset: () => Promise<void>;
  setRules: (r: Rules) => Promise<void>; answer: (decision: "send" | "rewrite" | "skip", note?: string) => Promise<void>;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json" }, ...init }); }
  catch { throw new Error("Can't reach the server. Is it running?"); }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
  return data as T;
}

export const useMail = create<S>((set, get) => ({
  items: [], msgs: [], agents: IDLE, report: null, rules: { money: true, meeting: true, stranger: true }, question: null, running: false, skew: 0, ttl: 300, error: null,
  async load() {
    try {
      const d = await call<{ items: MailItem[]; msgs: Msg[]; agents: Record<Agent, AgentState>; report: Report | null; rules: Rules; question: Question | null; running: boolean; now: string; ttl: number }>("/api/team");
      set({ items: d.items, msgs: d.msgs, agents: d.agents, report: d.report, rules: d.rules, question: d.question, running: d.running, ttl: d.ttl, skew: new Date(d.now).getTime() - Date.now(), error: null });
    } catch (e) { set({ error: e instanceof Error ? e.message : "Lost the server." }); }
  },
  async start() {
    try { await call("/api/team/start", { method: "POST" }); } catch (e) { set({ error: e instanceof Error && e.message.includes("404") ? "Old server: press Ctrl+C and run npm run demo again." : e instanceof Error ? e.message : "Could not start." }); return; }
    await get().load();
  },
  async reset() { await call("/api/team/reset", { method: "POST" }).catch(() => {}); await get().load(); },
  async setRules(r) { set({ rules: r }); await call("/api/team/rules", { method: "PUT", body: JSON.stringify(r) }).catch(() => {}); await get().load(); },
  async answer(decision, note = "") {
    set({ question: null });
    try { await call("/api/team/answer", { method: "POST", body: JSON.stringify({ decision, note }) }); } catch (e) { set({ error: e instanceof Error ? e.message : "Could not answer." }); }
    await get().load();
  },
}));

// What each rule means, with one colour each, used everywhere (rules, popup, chips).
export const RULE = {
  money: { label: "Money", icon: "cash", color: "#FBBF24", text: "Ask me before any reply about money" },
  meeting: { label: "Meeting", icon: "calendar", color: "#22D3EE", text: "Ask me before accepting a meeting" },
  stranger: { label: "Stranger", icon: "help-circle", color: "#F472B6", text: "Ask me before replying to someone I don't know" },
} as const;

// Why the team stopped: one of your rules, or the checker could not approve the reply.
export const HIT = { ...RULE, checker: { label: "Checker not sure", icon: "search", color: "#FB923C", text: "The checker could not approve the reply after 3 tries" } } as const;

// The four agents (plus our code and you), one colour and one job each.
export const WHO: Record<Who, { name: string; job: string; icon: string; color: string }> = {
  manager: { name: "Manager", job: "Hands out the work", icon: "briefcase", color: "#A78BFA" },
  sorter: { name: "Sorter", job: "What kind of email?", icon: "pricetags", color: "#22D3EE" },
  writer: { name: "Writer", job: "Writes the reply", icon: "create", color: "#F472B6" },
  checker: { name: "Checker", job: "Catches mistakes", icon: "search", color: "#FB923C" },
  code: { name: "Rule check", job: "Our code", icon: "shield-checkmark", color: "#94A3B8" },
  you: { name: "You", job: "Big decisions", icon: "person", color: "#FBBF24" },
};

// Each stage of an email, as the viewer sees it.
export const STAGE: Record<Stage, { label: string; color: string; icon: string }> = {
  waiting: { label: "IN INBOX", color: "#C4B5FD", icon: "mail-unread-outline" },
  sorting: { label: "SORTING", color: "#22D3EE", icon: "pricetags" },
  writing: { label: "WRITING", color: "#F472B6", icon: "create" },
  checking: { label: "CHECKING", color: "#FB923C", icon: "search" },
  rules: { label: "RULE CHECK", color: "#94A3B8", icon: "shield-checkmark" },
  asking: { label: "ASKING YOU", color: "#FBBF24", icon: "hand-left" },
  sent: { label: "SENT", color: "#34D399", icon: "paper-plane" },
  no_reply: { label: "NO REPLY NEEDED", color: "#94A3B8", icon: "checkmark-done" },
  blocked: { label: "SCAM BLOCKED", color: "#F87171", icon: "ban" },
  not_sent: { label: "NOT SENT", color: "#F87171", icon: "close-circle" },
};
