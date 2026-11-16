import "dotenv/config";
import { createApp } from "./app";
import { connectDb } from "./db";
import { needEnv, openaiLLM } from "./llm";
import { memoryStore } from "./store";
import type { Store } from "./types";

needEnv("OPENAI_API_KEY", "AGENT_MODEL");
const port = Number(process.env.PORT || 3007);

async function main() {
  // Part 4: with DATABASE_URL everything is saved in PostgreSQL. Without it, the server forgets on every restart.
  let store: Store = memoryStore();
  if (process.env.DATABASE_URL) {
    store = await connectDb(process.env.DATABASE_URL);
    const n = await store.markInterrupted(); // runs that were "running" when the server stopped
    const w = (await store.listApprovals({ status: "pending" })).length; // Part 5: open questions survive a restart
    console.log(`PostgreSQL connected.${n ? ` ${n} interrupted run${n > 1 ? "s" : ""}: open the app to resume.` : ""}${w ? ` ${w} question${w > 1 ? "s" : ""} waiting for you.` : ""}`);
  } else {
    console.log("No DATABASE_URL: memory only. Nothing survives a restart.");
  }

  createApp({ llm: openaiLLM(), store, db: process.env.DATABASE_URL ? "postgres" : "memory", sweepEveryMs: 2000 }).listen(port, "0.0.0.0", () => {
    console.log(`Mission Control · Part 6 · http://localhost:${port} · model: ${process.env.AGENT_MODEL}`);
  });
}

main().catch((e) => {
  console.error(`Could not start: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
