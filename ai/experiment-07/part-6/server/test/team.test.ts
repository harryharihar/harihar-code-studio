import express from "express";
import request from "supertest";
import { createTeam } from "../src/team";

// Part 6 demo: a team of four agents on the same inbox. Same story every time with the fake model.
const appWith = (ttlS = 30) => { const a = express(); a.use(express.json()); a.use(createTeam({ fake: true, ttlS })); return a; };
const state = async (a: express.Express) => (await request(a).get("/api/team")).body;
async function until(a: express.Express, ok: (s: any) => boolean, ms = 8000) {
  const t0 = Date.now();
  for (;;) { const s = await state(a); if (ok(s)) return s; if (Date.now() - t0 > ms) throw new Error("timeout: " + JSON.stringify(s.items.map((m: any) => m.stage))); await new Promise((r) => setTimeout(r, 50)); }
}
const said = (s: any, from: string, to: string, kind?: string) => s.msgs.filter((m: any) => m.from === from && m.to === to && (!kind || m.kind === kind));

test("the full team demo: sorter labels, checker catches a guessed date, you approve, the scam is blocked, the manager reports", async () => {
  const a = appWith();
  await request(a).post("/api/team/start").expect(200);

  // email 3: the writer guessed "this Friday", the checker sent it back, then the money rule asks you
  let s = await until(a, (x) => x.question?.emailId === "m3");
  expect(s.items.map((m: any) => m.stage)).toEqual(["sent", "no_reply", "asking", "waiting", "waiting"]);
  expect(s.items.map((m: any) => m.label)).toEqual(["friend", "automatic", "client", "", ""]);
  expect(s.items[2].caught).toMatch(/payment date/);
  expect(s.question.reply).not.toMatch(/Friday/);
  expect(s.question.hits).toEqual(["money"]);
  expect(said(s, "checker", "writer", "problem")).toHaveLength(1);
  expect(said(s, "manager", "sorter", "task")).toHaveLength(3);
  expect(s.agents.manager.state).toBe("waiting");

  await request(a).post("/api/team/answer").send({ decision: "send" }).expect(200);
  s = await until(a, (x) => x.question?.emailId === "m4");
  expect(s.question.hits).toEqual(["meeting"]);
  await request(a).post("/api/team/answer").send({ decision: "send" }).expect(200);

  s = await until(a, (x) => !x.running);
  expect(s.items.map((m: any) => m.stage)).toEqual(["sent", "no_reply", "sent", "sent", "blocked"]);
  expect(s.items.map((m: any) => m.answer)).toEqual(["auto", "", "approved", "approved", "blocked"]);
  // the scam never reached the writer
  expect(s.msgs.some((m: any) => m.emailId === "m5" && m.from === "writer")).toBe(false);
  expect(s.report).toMatchObject({ sentAlone: 1, sentWithOk: 2, blocked: 1, noReply: 1, notSent: 0, caught: 1 });
  expect(s.report.summary.length).toBeGreaterThan(20);
  expect(Object.values(s.agents).every((g: any) => g.state === "idle")).toBe(true);
});

test("your note goes to the writer, and the checker checks the new draft again", async () => {
  const a = appWith();
  await request(a).post("/api/team/start");
  await until(a, (x) => x.question?.emailId === "m3");
  await request(a).post("/api/team/answer").send({ decision: "rewrite", note: "say Monday" }).expect(200);
  const s = await until(a, (x) => x.question?.emailId === "m3" && x.question.round === 2);
  expect(s.question.reply).toContain("Monday");
  expect(said(s, "you", "writer", "task")).toHaveLength(1);
  expect(said(s, "checker", "manager", "ok").filter((m: any) => m.emailId === "m3")).toHaveLength(2);
});

test("turn a rule off: the boss's reply goes out without asking", async () => {
  const a = appWith();
  await request(a).put("/api/team/rules").send({ money: true, meeting: false, stranger: true }).expect(200);
  await request(a).post("/api/team/start");
  await until(a, (x) => x.question?.emailId === "m3");
  await request(a).post("/api/team/answer").send({ decision: "send" });
  const s = await until(a, (x) => !x.running);
  expect(s.items[3]).toMatchObject({ stage: "sent", answer: "auto" });
});

test("no answer in time = not sent, and the team goes on to the next email", async () => {
  const a = appWith(1);
  await request(a).post("/api/team/start");
  const s = await until(a, (x) => !x.running);
  expect(s.items.map((m: any) => m.stage)).toEqual(["sent", "no_reply", "not_sent", "not_sent", "blocked"]);
  expect(s.items[2].answer).toBe("expired");
  expect(s.report.notSent).toBe(2);
});

test("answers and rules are validated", async () => {
  const a = appWith();
  await request(a).post("/api/team/answer").send({ decision: "send" }).expect(409);
  await request(a).put("/api/team/rules").send({ money: "yes" }).expect(400);
  await request(a).post("/api/team/start");
  await until(a, (x) => !!x.question);
  await request(a).post("/api/team/answer").send({ decision: "maybe" }).expect(400);
  await request(a).post("/api/team/reset").expect(200);
  const s = await state(a);
  expect(s.items.every((m: any) => m.stage === "waiting")).toBe(true);
  expect(s.msgs).toEqual([]);
  expect(s.report).toBeNull();
});

test("writer and checker can't agree after 3 tries: the team asks you (never skips quietly)", async () => {
  const llm: any = {
    async parse({ name, input }: { name: string; input: string }) {
      if (name === "sort") return { data: { label: /Priya/.test(input) ? "client" : /Rahul/.test(input) ? "friend" : /Amazon/.test(input) ? "automatic" : /Anil/.test(input) ? "boss" : "scam", why: "test" }, tokens: 1 };
      if (name === "draft") return { data: { reply: "Hi, see you. – Harihar" }, tokens: 1 };
      if (name === "review") return { data: /Priya/.test(input) ? { ok: false, problem: "Still guessing." } : { ok: true, problem: "" }, tokens: 1 };
      return { data: { summary: "Done for the day, nothing else to report." }, tokens: 1 };
    },
    async respond() { throw new Error("not used"); },
  };
  const a = express(); a.use(express.json()); a.use(createTeam({ llm, ttlS: 30 }));
  await request(a).post("/api/team/start");
  const s = await until(a, (x) => x.question?.emailId === "m3");
  expect(s.question.hits).toEqual(["money", "checker"]);
  expect(said(s, "checker", "writer", "problem")).toHaveLength(3);
  await request(a).post("/api/team/answer").send({ decision: "skip" });
  await request(a).post("/api/team/reset");
});
