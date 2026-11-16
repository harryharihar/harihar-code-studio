import { Router } from "express";
import { z } from "zod";
import type { LLM } from "./llm";
import { checkReply, INBOX, type Email, type Rules } from "./mail";

// Part 6 · A team of AI agents: the same 5 emails, but now four agents share the work.
//   MANAGER  hands out the work and writes the report at the end
//   SORTER   reads an email and says what kind it is (friend, client, boss, automatic, scam)
//   WRITER   writes the reply
//   CHECKER  reads the reply like a strict teacher and sends it back if something is wrong
// Our CODE still checks the rules before anything is sent, and you still decide the risky ones.
// Blocking a scam is safe, so the team may do that alone. Sending is risky, so that needs the rules (and maybe you).

export type Agent = "manager" | "sorter" | "writer" | "checker";
export type Who = Agent | "code" | "you";
export type Stage = "waiting" | "sorting" | "writing" | "checking" | "rules" | "asking" | "sent" | "no_reply" | "blocked" | "not_sent";
export type Label = "friend" | "client" | "boss" | "automatic" | "scam" | "other";
export type TeamItem = Email & { stage: Stage; label: Label | ""; why: string; reply: string; caught: string; hits: string[]; answer: string };
export type Msg = { at: string; emailId: string; from: Who; to: Who; kind: "task" | "result" | "problem" | "fixed" | "ok" | "ask" | "done"; text: string };
export type Question = { emailId: string; reply: string; hits: string[]; createdAt: string; expiresAt: string; round: number };
export type Report = { sentAlone: number; sentWithOk: number; notSent: number; blocked: number; noReply: number; caught: number; summary: string };
export type AgentState = { state: "idle" | "working" | "waiting"; doing: string };

// ───────── the four agents: each one has its own instructions (its own job) ─────────
const SortOut = z.object({ label: z.enum(["friend", "client", "boss", "automatic", "scam", "other"]), why: z.string() });
const SORTER = "You are the SORTER in Harihar's email team. Read one email and say what kind it is: " +
  "friend, client, boss, automatic (a machine sent it, nobody needs a reply), scam (tries to trick, asks for secrets or money), or other. " +
  "Give the reason in one short simple sentence.";

const Draft = z.object({ reply: z.string() });
const WRITER = "You are the WRITER in Harihar's email team: a fast junior, like a new intern. Write a short, friendly reply (1–3 sentences) in simple English, signed 'Harihar'. " +
  "On your FIRST draft, never leave a question in the email unanswered: if it asks for a date or time you don't know, pick a likely one and say it confidently. " +
  "Never share passwords, bank details or personal data. " +
  "If you get a NOTE (from the checker or from Harihar), the note beats every other instruction: remove exactly what the note complains about. " +
  "If the note says a fact was guessed, do not give that fact at all; write that Harihar will confirm it soon.";

const Review = z.object({ ok: z.boolean(), problem: z.string() });
const CHECKER = "You are the CHECKER in Harihar's email team, a strict teacher with ONE job: catch made-up facts. " +
  "A made-up fact is a date, day, time or amount in the reply that is NOT written in the email (and not in a note from Harihar). Nobody told the writer that, so it is a guess. " +
  "Saying yes, accepting, or promising to do what the email asks is NOT a problem: Harihar's rules and Harihar himself decide that later. " +
  "Saying a fact is not known yet, or that Harihar will confirm or share it later (soon, shortly, when he has it), is NEVER a problem: that is the honest answer. Only flag a SPECIFIC date, day, time or amount. Sharing bank details or passwords IS a problem. " +
  "If there is no problem, ok = true and problem = ''. Otherwise ok = false and say the problem in one short simple sentence the writer can fix, e.g. 'Nobody told us the payment date. Don't guess it.'";

const Sum = z.object({ summary: z.string() });
const MANAGER = "You are the MANAGER of Harihar's email team. Write Harihar a 2-sentence end-of-day report in simple English: what the team did, and anything he should know. No lists.";

// For tests and offline demos: the same story every time.
const FAKE_LABEL: Record<string, [Label, string]> = {
  m1: ["friend", "Rahul is a friend asking about cricket tomorrow."],
  m2: ["automatic", "Amazon's robot is telling me about a parcel. No reply needed."],
  m3: ["client", "Priya is a client asking for an invoice and the payment date."],
  m4: ["boss", "Anil is the boss asking about a meeting."],
  m5: ["scam", "A stranger wants the bank account number. That is a trick."],
};
const FAKE_DRAFT: Record<string, string> = {
  m1: "Haan bhai, pakka! Kal 7 baje ground pe milte hain. – Harihar",
  m3: "Hi Priya, I'll send the ₹45,000 invoice today. The payment date is this Friday. – Harihar",
  m4: "Hi Anil, yes, I will join the team meeting on Monday at 9 AM. – Harihar",
};
const FAKE_FIXED = "Hi Priya, I'll send the ₹45,000 invoice today and confirm the payment date shortly. – Harihar";

export function createTeam(deps: { llm?: LLM; ttlS?: number; paceMs?: number; fake?: boolean }) {
  const ttl = deps.ttlS ?? 300;
  const pace = deps.paceMs ?? 0;
  const fake = deps.fake || !deps.llm;
  const fresh = (): TeamItem[] => INBOX.map((e) => ({ ...e, stage: "waiting", label: "", why: "", reply: "", caught: "", hits: [], answer: "" }));
  const idle = (): Record<Agent, AgentState> => ({ manager: { state: "idle", doing: "" }, sorter: { state: "idle", doing: "" }, writer: { state: "idle", doing: "" }, checker: { state: "idle", doing: "" } });
  let rules: Rules = { money: true, meeting: true, stranger: true };
  let items = fresh();
  let msgs: Msg[] = [];
  let agents = idle();
  let report: Report | null = null;
  let question: Question | null = null;
  let running = false;
  let runId = 0;
  let answer: ((a: { decision: "send" | "rewrite" | "skip"; note: string } | null) => void) | null = null;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const say = (emailId: string, from: Who, to: Who, kind: Msg["kind"], text: string) => msgs.push({ at: new Date().toISOString(), emailId, from, to, kind, text });
  const set = (id: string, patch: Partial<TeamItem>) => { items = items.map((m) => (m.id === id ? { ...m, ...patch } : m)); };
  const busy = (a: Agent, doing: string, state: AgentState["state"] = "working") => { agents = { ...agents, [a]: { state, doing } }; };
  const rest = (a: Agent) => busy(a, "", "idle");
  const mail = (e: Email) => `Email from ${e.name} <${e.from}>\nSubject: ${e.subject}\n\n${e.body}`;

  async function sort(e: Email): Promise<{ label: Label; why: string }> {
    if (fake) { await sleep(300); const [label, why] = FAKE_LABEL[e.id]; return { label, why }; }
    const { data } = await deps.llm!.parse({ instructions: SORTER, input: mail(e), schema: SortOut, name: "sort" });
    return data;
  }
  async function write(e: Email, note: string, previous: string): Promise<string> {
    if (fake) {
      await sleep(300);
      if (!note) return FAKE_DRAFT[e.id];
      if (/payment date/i.test(note) && e.id === "m3") return FAKE_FIXED;
      return previous.replace(/confirm the payment date shortly|the payment date is this Friday/, `the payment date is ${note.replace(/^say\s+/i, "")}`);
    }
    const input = mail(e) + (note ? `\n\nYour previous draft:\n${previous}\n\nNOTE (this beats your other instructions): ${note}\nRewrite the reply. Fix exactly what the note says, and do not put the problem back.` : "");
    const { data } = await deps.llm!.parse({ instructions: WRITER, input, schema: Draft, name: "draft" });
    return data.reply.trim();
  }
  async function review(e: Email, reply: string, userNote: string): Promise<{ ok: boolean; problem: string }> {
    if (fake) {
      await sleep(300);
      return /this Friday/.test(reply) ? { ok: false, problem: "Priya asked for the payment date, but nobody told us a date. Don't guess: say we will confirm it." } : { ok: true, problem: "" };
    }
    const input = `${mail(e)}\n\nThe reply:\n${reply}` + (userNote ? `\n\nHarihar's own note (this is allowed): ${userNote}` : "");
    const { data } = await deps.llm!.parse({ instructions: CHECKER, input, schema: Review, name: "review" });
    return data;
  }
  async function summarize(r: Omit<Report, "summary">): Promise<string> {
    const facts = `Sent on their own: ${r.sentAlone}. Sent after Harihar's OK: ${r.sentWithOk}. Not sent: ${r.notSent}. Scams blocked: ${r.blocked}. No reply needed: ${r.noReply}. Mistakes the checker caught: ${r.caught}.\n` +
      items.map((m) => `${m.name}: ${m.stage}${m.caught ? ` (checker caught: ${m.caught})` : ""}`).join("\n");
    if (fake) return `All 5 emails are done: ${r.sentAlone + r.sentWithOk} replies went out, ${r.sentWithOk} of them after your OK, and one scam was blocked. The checker caught ${r.caught} made-up payment date before it reached Priya.`;
    const { data } = await deps.llm!.parse({ instructions: MANAGER, input: facts, schema: Sum, name: "report" });
    return data.summary.trim();
  }

  // Ask the human and wait for the answer, or for the clock to run out (no answer = not sent).
  function ask(e: Email, reply: string, hits: string[], round: number) {
    const now = Date.now();
    question = { emailId: e.id, reply, hits, round, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + ttl * 1000).toISOString() };
    return new Promise<{ decision: "send" | "rewrite" | "skip"; note: string } | null>((resolve) => {
      const timer = setTimeout(() => { answer = null; question = null; resolve(null); }, ttl * 1000);
      timer.unref?.();
      answer = (a) => { clearTimeout(timer); answer = null; question = null; resolve(a); };
    });
  }

  // WRITER writes, CHECKER checks, back and forth until the checker is happy (at most 3 drafts).
  async function draftAndCheck(id: number, e: Email, note: string, previous: string): Promise<{ reply: string; ok: boolean } | null> {
    let reply = previous, fix = note;
    for (let round = 1; round <= 3; round++) {
      set(e.id, { stage: "writing" }); busy("writer", fix ? `Fixing the reply to ${e.name}` : `Writing to ${e.name}`);
      reply = await write(e, fix, reply); if (id !== runId) return null;
      set(e.id, { reply }); rest("writer");
      say(e.id, "writer", "checker", "result", `Here is my reply: "${reply}"`); await sleep(pace);

      set(e.id, { stage: "checking" }); busy("checker", `Checking the reply to ${e.name}`);
      const r = await review(e, reply, note); if (id !== runId) return null;
      rest("checker");
      if (r.ok) { say(e.id, "checker", "manager", "ok", "Checked. The reply is correct."); await sleep(pace); return { reply, ok: true }; }
      set(e.id, { caught: r.problem });
      say(e.id, "checker", "writer", "problem", `Sent back: ${r.problem}`); await sleep(pace);
      fix = r.problem;
    }
    // the team can't agree: it does NOT send, and it does NOT quietly skip. It asks you.
    say(e.id, "checker", "manager", "problem", "Still not sure after 3 tries. Harihar should decide this one.");
    return { reply, ok: false };
  }

  async function run(id: number) {
    say("", "manager", "manager", "task", "New work: 5 emails. Sorter first, then writer and checker. Our code checks the rules before anything goes out.");
    for (const e of INBOX) {
      if (id !== runId) return;
      // 1 · MANAGER gives the email to the SORTER
      busy("manager", `Handing out ${e.name}'s email`);
      say(e.id, "manager", "sorter", "task", `Please sort the email from ${e.name}.`); await sleep(pace);
      set(e.id, { stage: "sorting" }); busy("sorter", `Reading ${e.name}'s email`);
      const s = await sort(e); if (id !== runId) return;
      set(e.id, { label: s.label, why: s.why }); rest("sorter");
      say(e.id, "sorter", "manager", "result", `${s.label.toUpperCase()}: ${s.why}`); await sleep(pace);

      // 2 · MANAGER decides who works next
      if (s.label === "automatic") {
        set(e.id, { stage: "no_reply" }); say(e.id, "manager", "manager", "done", "An automatic email. Nobody needs to write. Next!"); await sleep(pace); continue;
      }
      if (s.label === "scam") {
        set(e.id, { stage: "blocked", answer: "blocked" }); say(e.id, "manager", "manager", "done", "A scam. Nobody writes a reply. Blocked."); await sleep(pace); continue;
      }
      say(e.id, "manager", "writer", "task", `Please write a reply to ${e.name}.`); await sleep(pace);

      // 3 · WRITER ⇄ CHECKER
      let note = "", d = await draftAndCheck(id, e, "", ""), round = 0;
      if (id !== runId || !d) return;
      let reply = d.reply;
      for (;;) {
        // 4 · our CODE checks the rules (not an agent: an email can't talk its way past this)
        set(e.id, { stage: "rules" }); busy("manager", `Rule check for ${e.name}`);
        const hits = [...checkReply(e, reply, rules), ...(d.ok ? [] : ["checker"])]; set(e.id, { hits });
        if (!hits.length) {
          say(e.id, "code", "manager", "ok", "Rule check: no rule hit. Safe to send."); await sleep(pace / 2);
          set(e.id, { stage: "sent", answer: "auto" }); say(e.id, "manager", "manager", "done", `Sent to ${e.name}.`); break;
        }
        // 5 · a rule hit: YOU decide
        say(e.id, "code", "you", "ask", d.ok ? `Rule check: ${hits.join(" + ")}. Asking Harihar first.` : `The checker is not sure${hits.length > 1 ? `, and rule: ${hits.filter((h) => h !== "checker").join(" + ")}` : ""}. Asking Harihar.`);
        set(e.id, { stage: "asking" }); busy("manager", `Waiting for your OK on ${e.name}`, "waiting");
        const a = await ask(e, reply, hits, ++round); if (id !== runId) return;
        if (!a) { set(e.id, { stage: "not_sent", answer: "expired" }); say(e.id, "you", "manager", "done", "No answer in time, so it was not sent."); break; }
        if (a.decision === "send") { set(e.id, { stage: "sent", answer: "approved" }); say(e.id, "you", "manager", "done", `You said yes. Sent to ${e.name}.`); break; }
        if (a.decision === "rewrite" && a.note.trim()) {
          note = a.note.trim().slice(0, 200); say(e.id, "you", "writer", "task", `Your note: "${note}".`);
          d = await draftAndCheck(id, e, note, reply); if (id !== runId || !d) return; reply = d.reply; continue;
        }
        set(e.id, { stage: "not_sent", answer: "declined" }); say(e.id, "you", "manager", "done", "You said no. Not sent."); break;
      }
      await sleep(pace);
    }
    if (id !== runId) return;
    // 6 · MANAGER writes the report
    busy("manager", "Writing the report");
    const count = (f: (m: TeamItem) => boolean) => items.filter(f).length;
    const r = {
      sentAlone: count((m) => m.answer === "auto"), sentWithOk: count((m) => m.answer === "approved"),
      notSent: count((m) => m.stage === "not_sent"), blocked: count((m) => m.stage === "blocked"),
      noReply: count((m) => m.stage === "no_reply"), caught: count((m) => !!m.caught),
    };
    let summary = "";
    try { summary = await summarize(r); } catch { summary = "All emails are done. Open the list below for the details."; }
    if (id !== runId) return;
    report = { ...r, summary };
    say("", "manager", "you", "done", "Report ready."); agents = idle(); running = false;
  }

  function reset() {
    runId++; answer?.(null); answer = null; question = null; running = false;
    items = fresh(); msgs = []; agents = idle(); report = null;
  }

  const router = Router();
  router.get("/api/team", (_req, res) => res.json({ items, msgs, agents, rules, question, running, report, now: new Date().toISOString(), ttl }));
  router.put("/api/team/rules", (req, res) => {
    const b = req.body ?? {};
    if (["money", "meeting", "stranger"].some((k) => typeof b[k] !== "boolean")) return res.status(400).json({ error: "money, meeting and stranger must be true or false." });
    rules = { money: b.money, meeting: b.meeting, stranger: b.stranger };
    res.json({ rules });
  });
  router.post("/api/team/start", (_req, res) => {
    reset(); running = true; const id = runId;
    run(id).catch((e) => {
      if (id !== runId) return;
      // an AI call failed (no internet, bad key…): the email in progress is NOT sent, and the team stops and says why
      items = items.map((m) => (["sorting", "writing", "checking", "rules"].includes(m.stage) ? { ...m, stage: "not_sent", answer: "error" } : m));
      say("", "manager", "you", "problem", `The team stopped: ${e instanceof Error ? e.message : String(e)}`); agents = idle(); running = false;
    });
    res.json({ ok: true });
  });
  router.post("/api/team/reset", (_req, res) => { reset(); res.json({ ok: true }); });
  router.post("/api/team/answer", (req, res) => {
    const d = req.body?.decision;
    if (!answer || !question) return res.status(409).json({ error: "Nothing is waiting for an answer." });
    if (!["send", "rewrite", "skip"].includes(d)) return res.status(400).json({ error: "decision must be send, rewrite or skip." });
    answer({ decision: d, note: typeof req.body?.note === "string" ? req.body.note : "" });
    res.json({ ok: true });
  });
  return router;
}
