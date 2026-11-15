import express from "express";
import request from "supertest";
import { checkReply, createMail, INBOX } from "../src/mail";

// Part 5 demo: the email agent. Same inbox, same order, same questions, every time.
const ALL = { money: true, meeting: true, stranger: true };
const appWith = (ttlS = 30) => { const a = express(); a.use(express.json()); a.use(createMail({ fake: true, ttlS })); return a; };
const state = async (a: express.Express) => (await request(a).get("/api/mail")).body;
async function until(a: express.Express, ok: (s: any) => boolean, ms = 8000) {
  const t0 = Date.now();
  for (;;) { const s = await state(a); if (ok(s)) return s; if (Date.now() - t0 > ms) throw new Error("timeout: " + JSON.stringify(s.items.map((m: any) => m.stage))); await new Promise((r) => setTimeout(r, 50)); }
}

test("the rules are checked in code, on the email itself", () => {
  const [m1, m2, m3, m4, m5] = INBOX;
  expect(checkReply(m1, "Sure, I'll join you!", ALL)).toEqual([]);
  expect(checkReply(m2, "", ALL)).toEqual(["stranger"]);
  expect(checkReply(m3, "", ALL)).toEqual(["money"]);
  expect(checkReply(m4, "", ALL)).toEqual(["meeting"]);
  expect(checkReply(m5, "", ALL)).toEqual(["money", "stranger"]);
  expect(checkReply(m3, "", { ...ALL, money: false })).toEqual([]);
});

test("the full demo: 1 sent alone, 2 no reply, 3 rewrite then send, 4 send, 5 the trick is still asked and refused", async () => {
  const a = appWith();
  await request(a).post("/api/mail/start").expect(200);
  let s = await until(a, (x) => x.question?.emailId === "m3");
  expect(s.items.map((m: any) => m.stage)).toEqual(["sent", "no_reply", "asking", "waiting", "waiting"]);
  expect(s.question.hits).toEqual(["money"]);

  await request(a).post("/api/mail/answer").send({ decision: "rewrite", note: "say Monday" }).expect(200);
  s = await until(a, (x) => x.question?.emailId === "m3" && x.question.round === 2);
  expect(s.question.reply).toContain("Monday");
  await request(a).post("/api/mail/answer").send({ decision: "send" }).expect(200);

  s = await until(a, (x) => x.question?.emailId === "m4");
  expect(s.question.hits).toEqual(["meeting"]);
  await request(a).post("/api/mail/answer").send({ decision: "send" }).expect(200);

  s = await until(a, (x) => x.question?.emailId === "m5");
  expect(s.question.hits).toEqual(["money", "stranger"]);
  await request(a).post("/api/mail/answer").send({ decision: "skip" }).expect(200);

  s = await until(a, (x) => !x.running);
  expect(s.items.map((m: any) => m.stage)).toEqual(["sent", "no_reply", "sent", "sent", "not_sent"]);
  expect(s.items.map((m: any) => m.answer)).toEqual(["auto", "", "approved", "approved", "declined"]);
});

test("no answer in time = not sent, and the agent goes on", async () => {
  const a = appWith(1);
  await request(a).post("/api/mail/start");
  const s = await until(a, (x) => !x.running);
  expect(s.items.map((m: any) => m.stage)).toEqual(["sent", "no_reply", "not_sent", "not_sent", "not_sent"]);
  expect(s.items[2].answer).toBe("expired");
});

test("answers and rules are validated", async () => {
  const a = appWith();
  await request(a).post("/api/mail/answer").send({ decision: "send" }).expect(409);
  await request(a).put("/api/mail/rules").send({ money: "yes" }).expect(400);
  const r = await request(a).put("/api/mail/rules").send({ money: false, meeting: true, stranger: true }).expect(200);
  expect(r.body.rules.money).toBe(false);
});
