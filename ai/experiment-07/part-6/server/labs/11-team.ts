import "dotenv/config";
import express from "express";
import { needEnv, openaiLLM } from "../src/llm";
import { createTeam } from "../src/team";

// Lab 11 · Part 6: the email TEAM with the real model. Prints every handoff between the agents.
// The lab answers the popups itself: "send" for the client and the boss.
needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const app = express(); app.use(express.json()); app.use(createTeam({ llm: openaiLLM(), ttlS: 60 }));
const srv = app.listen(0, async () => {
  const url = `http://localhost:${(srv.address() as any).port}`;
  const get = async () => (await fetch(`${url}/api/team`)).json() as Promise<any>;
  await fetch(`${url}/api/team/start`, { method: "POST" });
  let shown = 0;
  for (;;) {
    const s = await get();
    for (const m of s.msgs.slice(shown)) console.log(`${m.from.toUpperCase().padEnd(8)} → ${m.to.toUpperCase().padEnd(8)} ${m.kind.padEnd(7)} ${m.text}`);
    shown = s.msgs.length;
    if (s.question) {
      console.log(`\n  POPUP  ${s.question.emailId} · ${s.question.hits.join(" + ")} · "${s.question.reply}"  → lab says: send\n`);
      await fetch(`${url}/api/team/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "send" }) });
    }
    if (!s.running && s.report) { console.log("\nREPORT", JSON.stringify(s.report, null, 2)); break; }
    await new Promise((r) => setTimeout(r, 300));
  }
  srv.close();
});
