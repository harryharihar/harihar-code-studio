import { create } from "zustand";

// Part 5 demo: "My AI agent replies to my emails". The phone asks the server once a second.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3007";

export type Rules = { money: boolean; meeting: boolean; stranger: boolean };
export type Stage = "waiting" | "reading" | "writing" | "checking" | "asking" | "sent" | "no_reply" | "not_sent";
export type MailItem = { id: string; from: string; name: string; contact: boolean; noreply: boolean; subject: string; body: string; stage: Stage; reply: string; hits: string[]; answer: string };
export type Question = { emailId: string; reply: string; hits: string[]; createdAt: string; expiresAt: string; round: number };
export type MailEvent = { at: string; emailId: string; step: string; text: string };

type S = {
  items: MailItem[]; events: MailEvent[]; rules: Rules; question: Question | null; running: boolean; skew: number; ttl: number; error: string | null;
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
  items: [], events: [], rules: { money: true, meeting: true, stranger: true }, question: null, running: false, skew: 0, ttl: 300, error: null,
  async load() {
    try {
      const d = await call<{ items: MailItem[]; events: MailEvent[]; rules: Rules; question: Question | null; running: boolean; now: string; ttl: number }>("/api/mail");
      set({ items: d.items, events: d.events, rules: d.rules, question: d.question, running: d.running, ttl: d.ttl, skew: new Date(d.now).getTime() - Date.now(), error: null });
    } catch (e) { set({ error: e instanceof Error ? e.message : "Lost the server." }); }
  },
  async start() {
    try { await call("/api/mail/start", { method: "POST" }); } catch (e) { set({ error: e instanceof Error && e.message.includes("404") ? "Old server: press Ctrl+C and run npm run demo again." : e instanceof Error ? e.message : "Could not start." }); return; }
    await get().load();
  },
  async reset() { await call("/api/mail/reset", { method: "POST" }).catch(() => {}); await get().load(); },
  async setRules(r) { set({ rules: r }); await call("/api/mail/rules", { method: "PUT", body: JSON.stringify(r) }).catch(() => {}); await get().load(); },
  async answer(decision, note = "") {
    set({ question: null });
    try { await call("/api/mail/answer", { method: "POST", body: JSON.stringify({ decision, note }) }); } catch (e) { set({ error: e instanceof Error ? e.message : "Could not answer." }); }
    await get().load();
  },
}));

// What each rule means, with one colour each, used everywhere (rules, popup, chips).
export const RULE = {
  money: { label: "Money", icon: "cash", color: "#FBBF24", text: "Ask me before any reply about money" },
  meeting: { label: "Meeting", icon: "calendar", color: "#22D3EE", text: "Ask me before accepting a meeting" },
  stranger: { label: "Stranger", icon: "help-circle", color: "#F472B6", text: "Ask me before replying to someone I don't know" },
} as const;

// Each stage of an email, as the viewer sees it.
export const STAGE: Record<Stage, { label: string; color: string; icon: string }> = {
  waiting: { label: "IN INBOX", color: "#5D6888", icon: "mail-unread-outline" },
  reading: { label: "READING", color: "#A78BFA", icon: "eye" },
  writing: { label: "WRITING", color: "#A78BFA", icon: "create" },
  checking: { label: "RULE CHECK", color: "#22D3EE", icon: "shield-checkmark" },
  asking: { label: "ASKING YOU", color: "#FBBF24", icon: "hand-left" },
  sent: { label: "SENT", color: "#34D399", icon: "paper-plane" },
  no_reply: { label: "NO REPLY NEEDED", color: "#94A3B8", icon: "checkmark-done" },
  not_sent: { label: "NOT SENT", color: "#F87171", icon: "close-circle" },
};
