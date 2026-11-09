import { MAX_STEPS, runAgent } from "../src/agent";
import { addDays, today } from "../src/clock";
import { memoryStore } from "../src/store";
import { call, msg, scripted } from "./helpers";

const tomorrow = addDays(today().date, 1);

async function exec(llm: ReturnType<typeof scripted>) {
  const store = memoryStore();
  const r = await store.createRun("Prepare me for a Senior React Native interview in seven days.");
  await runAgent(r.id, r.goal, { llm, store });
  return { store, run: (await store.getRun(r.id))! };
}

test("plan → act → observe → decide → final, in order", async () => {
  const llm = scripted([
    [msg("First I need today's date."), call("get_today", {})],
    [msg("Now I will add day one."), call("create_task", { title: "React basics", day: tomorrow, minutes: 90, notes: "hooks" })],
    [msg("Plan is ready."), ],
  ]);
  const { store, run } = await exec(llm);
  expect(run.status).toBe("done");
  expect(run.events.map((e) => e.kind)).toEqual(["goal", "plan", "act", "observe", "decide", "act", "observe", "decide", "final"]);
  expect((await store.listTasks()).map((t) => t.title)).toEqual(["React basics"]);
});

test("a bad tool call becomes an observation, and the agent can fix it", async () => {
  const llm = scripted([
    [call("create_task", { title: "Old", day: "2020-01-01", minutes: 60, notes: "x" })],
    (input) => {
      const last = JSON.parse(input[input.length - 1].output);
      expect(last.ok).toBe(false); // the model SAW the mistake
      return [call("create_task", { title: "Fixed", day: tomorrow, minutes: 60, notes: "x" })];
    },
    [msg("Done.")],
  ]);
  const { store } = await exec(llm);
  expect((await store.listTasks()).map((t) => t.title)).toEqual(["Fixed"]);
});

test("wrong argument types never reach the tool", async () => {
  const llm = scripted([[call("create_task", { title: "x", day: tomorrow, minutes: "lots", notes: "y" })], [msg("ok")]]);
  const { store, run: r } = await exec(llm);
  expect(await store.listTasks()).toHaveLength(0);
  expect(r.events.find((e) => e.kind === "observe")!.detail).toContain('"ok":false');
});

test("an agent that never stops is stopped by the step limit", async () => {
  const llm = scripted([[call("list_tasks", {})]]); // the same request, forever
  const { run: r } = await exec(llm);
  expect(llm.calls).toBe(MAX_STEPS);
  expect(r.events.at(-1)!.title).toMatch(/step limit/i);
});
