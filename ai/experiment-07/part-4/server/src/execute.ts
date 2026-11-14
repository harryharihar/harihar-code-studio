import { z } from "zod";
import { niceDay, today } from "./clock";
import type { Item, LLM } from "./llm";
import { notesBlock } from "./memory";
import { optionsFor, orderList, rupees, spent, verifyOrder } from "./shops";
import { callTool, toolDefs, Transient, type Tool } from "./tools";
import type { EventKind, Store, Task, Usage } from "./types";

// ─── The limits. An agent that acts must always be able to stop. ───────────────────────────────
export const BUDGET = { steps: 30, tokens: 250_000, seconds: 240 }; // model calls, tokens, wall-clock time
export const MAX_RETRIES = 2; // a timeout is tried again at most twice
export const SAME_CALL_LIMIT = 2; // the 3rd identical call is blocked by the loop guard
export const MAX_GUARD_TRIPS = 3; // blocked 3 times → the run stops

export type Budget = typeof BUDGET;

// "Practice mode": the real world fails. We fail on purpose, at fixed points, so a demo can be repeated.
// Order #2 times out once (→ retry). Order #4 says "ordered" but is not saved (→ verify catches it).
type Chaos = { on: boolean; orders: number; dropped: boolean };

export type ExecCtx = { store: Store; runId: string; now: () => Date; attempt: number; chaos: Chaos };

// ─── Tools the executor can use ──────────────────────────────────────────────────────────────────
// The next task whose "must come first" tasks are all ordered, with the shops that sell it.
async function nextUp(store: Store) {
  const tasks = await store.listTasks();
  const left = tasks.filter((t) => !t.order);
  const budgetLeft = (await store.getBudget()) - spent(tasks);
  if (left.length === 0) return { allDone: true, left: 0, budgetLeft };
  const ready = (t: Task) => t.dependsOn.every((d) => tasks.find((x) => x.ref === d)?.order);
  const t = left.find(ready) ?? left[0];
  return {
    allDone: false,
    left: left.length,
    budgetLeft,
    task: { id: t.ref, title: t.title, plannedCost: t.cost, needBy: niceDay(t.day) },
    options: optionsFor(t),
  };
}

const getNextTask: Tool<{}, ExecCtx> = {
  name: "get_next_task",
  description: "Get the next task that still needs an order, with the shops that sell it and the budget left. Call this first.",
  schema: z.object({}),
  async run(_a, { store }) {
    return { ok: true, ...(await nextUp(store)) };
  },
};

const placeOrder: Tool<{ taskId: string; shop: string }, ExecCtx> = {
  name: "place_order",
  description: "Order one task from one shop. On success it also returns the next task.",
  schema: z.object({
    taskId: z.string().describe('The task id, e.g. "t3"'),
    shop: z.string().describe("The shop name, exactly as get_next_task gave it"),
  }),
  async run(a, { store, attempt, chaos }) {
    const tasks = await store.listTasks();
    const t = tasks.find((x) => x.ref === a.taskId);
    if (!t) return { ok: false, error: `No task with id ${a.taskId}.` };
    // Part 4: the order list lives in the database, so this check survives a restart. Nothing is ever paid for twice.
    if (t.order) return { ok: false, error: `${a.taskId} is already ordered from ${t.order.shop} (${t.order.id}). Never order it twice.` };
    const missing = t.dependsOn.filter((d) => !tasks.find((x) => x.ref === d)?.order);
    if (missing.length) return { ok: false, error: `${a.taskId} needs ${missing.join(", ")} first. Order that first.` };
    const options = optionsFor(t);
    const o = options.find((x) => x.shop.toLowerCase() === a.shop.trim().toLowerCase());
    if (!o) return { ok: false, error: `${a.shop} does not sell this. Choose one of: ${options.map((x) => x.shop).join(", ")}.` };
    // BUDGET (money): the agent can never spend more than the user gave it
    const budgetLeft = (await store.getBudget()) - spent(tasks);
    if (o.price > budgetLeft) return { ok: false, error: `Over budget: ${o.shop} costs ${rupees(o.price)}, only ${rupees(budgetLeft)} is left. Pick a cheaper shop.` };

    // the unreliable shops, only in practice mode
    if (attempt === 0) chaos.orders++;
    if (chaos.on && chaos.orders === 2 && attempt === 0) throw new Transient(`${o.shop} didn't answer`);
    const id = `#${1040 + Math.max(chaos.orders, tasks.filter((x) => x.order).length + 1)}`; // after a restart, numbers go on from the saved orders
    if (chaos.on && chaos.orders === 4 && !chaos.dropped) {
      chaos.dropped = true;
      return { ok: true, ordered: `${a.taskId} · ${o.shop} · ${rupees(o.price)} · order ${id}`, next: await nextUp(store) }; // said ok, saved nothing
    }

    await store.updateTask(t.id, { order: { id, shop: o.shop, item: o.item, price: o.price, eta: niceDay(t.day) }, verified: false });
    return { ok: true, ordered: `${a.taskId} · ${o.shop} · ${rupees(o.price)} · order ${id}`, next: await nextUp(store) };
  },
};

const checkOrders: Tool<{}, ExecCtx> = {
  name: "check_orders",
  description: "See the shops' order list: every order that was really saved, and the money spent.",
  schema: z.object({}),
  async run(_a, { store }) {
    const tasks = await store.listTasks();
    return { ok: true, orders: orderList(tasks).map((o) => `${o.ref} ${o.title}: ${o.shop} ${rupees(o.price)} ${o.id}`), spent: spent(tasks), budgetLeft: (await store.getBudget()) - spent(tasks) };
  },
};

export const EXEC_TOOLS: Tool<any, ExecCtx>[] = [getNextTask, placeOrder, checkOrders];

export function executorInstructions(budget: number, at = new Date(), memory = "") {
  return `You are the executor of Mission Control. The user accepted a party plan and gave you a budget of ${rupees(budget)}. Order every task from a shop.
Today is ${today(at).weekday}, ${today(at).date}.
${memory ? `\n${memory}\n` : ""}

Work in a loop:
1. Call get_next_task. It gives the next task, the shops that sell it and the budget left.
2. Order it with place_order. If a saved note says what the user likes or cannot have, pick the shop whose item fits that note.
   Otherwise pick the best-rated shop whose price is not more than plannedCost. If none fits, pick the cheapest.
3. place_order's answer already contains the next task. Keep ordering until it says allDone.

Rules:
- Before every tool call, write ONE short sentence: what you will do and why.
- Never spend more than the budget left.
- If a tool fails, read the error and change something. Never repeat the exact same call.
- When every task is ordered, stop calling tools and write a two-sentence summary.`;
}

// ─── The execution loop ──────────────────────────────────────────────────────────────────────────
// decide → act → (retry) → verify → CHECKPOINT → decide again … until done, or until a limit says stop.
// Part 4: resume = true continues an interrupted run from its last checkpoint.
export async function runExecutor(
  runId: string,
  deps: { llm: LLM; store: Store; flaky?: boolean; resume?: boolean; pace?: number; now?: () => Date; budget?: Budget; sleep?: (ms: number) => Promise<void> },
) {
  const { llm, store } = deps;
  const now = deps.now ?? (() => new Date());
  const budget = deps.budget ?? BUDGET;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const say = (kind: EventKind, title: string, detail = "") => store.addEvent(runId, kind, title, detail);

  // Part 4: on resume, start from the checkpoint: the same conversation, the same spending so far
  const saved = deps.resume ? await store.loadCheckpoint(runId) : undefined;
  const usage: Usage = saved ? { ...saved.usage } : { steps: 0, tokens: 0, seconds: 0 };
  const started = Date.now() - usage.seconds * 1000; // the time budget keeps counting from where it stopped
  const seen = new Map<string, number>(); // loop guard memory: call → how many times
  let guardTrips = 0;
  let nudged = false;
  const chaos: Chaos = { on: !!deps.flaky && !deps.resume, orders: 0, dropped: false }; // practice mode is for the first go only
  const stop = async (title: string, detail: string) => {
    await say("budget", title, detail);
    await store.setStatus(runId, "failed");
  };

  const tasks = await store.listTasks();
  const money = await store.getBudget();
  const memory = notesBlock(await store.listNotes()); // long-term memory: what the user likes
  let input: Item[];

  if (deps.resume) {
    await store.setStatus(runId, "running");
    // An order that was saved just before the restart, but never verified: verify it now, so nothing is ordered twice
    for (const t of tasks.filter((x) => x.order && !x.verified)) {
      if ((await verifyOrder(store, t.ref)).length === 0) {
        await store.updateTask(t.id, { verified: true });
        await say("verify", `${t.ref} verified`, JSON.stringify({ ok: true, text: `${t.ref} · ${t.order!.shop} · ${rupees(t.order!.price)} · saved before the restart` }));
      }
    }
    const now0 = await store.listTasks();
    const done = now0.filter((t) => t.order).length;
    await say("resume", "Resumed after restart", `${done} of ${now0.length} already ordered: not ordered again · ${now0.length - done} left · ${rupees(money - spent(now0))} left`);
    input = saved?.input?.length ? saved.input : [{ role: "user", content: "Order everything in my accepted plan." }];
    input.push({ role: "user", content: `The server restarted. ${done} of ${now0.length} things are already ordered and saved. Never order them again. Call get_next_task and continue.` });
  } else {
    await say("goal", "Run the plan", `${tasks.length} things to order · budget ${rupees(money)}${chaos.on ? " · practice mode ON" : ""}`);
    input = [{ role: "user", content: "Order everything in my accepted plan." }];
  }
  const checkpoint = () => store.saveCheckpoint(runId, { input, usage }); // short-term memory → the database

  while (true) {
    // BUDGETS: checked before every model call
    usage.seconds = Math.round((Date.now() - started) / 1000);
    await store.setUsage(runId, usage);
    if (usage.steps >= budget.steps) return stop("Step budget used up", `${usage.steps} of ${budget.steps} model calls. The agent stops here.`);
    if (usage.tokens >= budget.tokens) return stop("Token budget used up", `${usage.tokens.toLocaleString("en-IN")} of ${budget.tokens.toLocaleString("en-IN")} tokens. The agent stops here.`);
    if (usage.seconds >= budget.seconds) return stop("Time budget used up", `${usage.seconds} of ${budget.seconds} seconds. The agent stops here.`);

    const res = await llm.respond({ instructions: executorInstructions(money, now(), memory), input, tools: toolDefs(EXEC_TOOLS) });
    usage.steps++;
    usage.tokens += res.tokens;
    usage.seconds = Math.round((Date.now() - started) / 1000);
    await store.setUsage(runId, usage);
    input.push(...res.output);

    for (const item of res.output) {
      if (item.type === "message") {
        const text = item.content?.map((c: any) => c.text ?? "").join("").trim();
        if (text) await say("think", "Deciding", text);
      }
    }

    const calls = res.output.filter((i: Item) => i.type === "function_call");
    if (calls.length === 0) {
      // The model says it is finished. Our code checks the order list before we believe it.
      const all = await store.listTasks();
      const missing = all.filter((t) => !t.order || !t.verified).map((t) => t.ref);
      if (missing.length && !nudged) {
        nudged = true;
        await say("verify", "Not finished", JSON.stringify({ ok: false, problems: [`${missing.join(", ")} not ordered yet.`] }));
        input.push({ role: "user", content: `Our check of the order list: ${missing.join(", ")} are not ordered yet. Continue.` });
        await checkpoint();
        continue;
      }
      const ordered = all.length - missing.length;
      await say("final", missing.length ? `${ordered} of ${all.length} things ordered` : `All ${all.length} things ordered · ${rupees(spent(all))} of ${rupees(money)}`, res.text);
      await store.setStatus(runId, missing.length ? "failed" : "done");
      return;
    }

    for (const call of calls) {
      // LOOP GUARD: the same call with the same arguments, again and again, is a stuck agent
      const key = `${call.name} ${normalise(call.arguments)}`;
      const times = (seen.get(key) ?? 0) + 1;
      seen.set(key, times);
      let result: Record<string, any>;

      if (times > SAME_CALL_LIMIT) {
        guardTrips++;
        await say("guard", `Blocked: ${call.name}`, `Same call ${times} times. Trip ${guardTrips} of ${MAX_GUARD_TRIPS}.`);
        result = { ok: false, error: `Loop guard: you already made this exact call ${times - 1} times. Do something different.` };
        input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
        if (guardTrips >= MAX_GUARD_TRIPS) return stop("Stopped by the loop guard", `The agent kept repeating itself ${guardTrips} times.`);
        continue;
      }

      await say("act", call.name, actText(call.name, call.arguments));
      result = await withRetry(call.name, call.arguments, { store, runId, now, attempt: 0, chaos }, say, sleep);

      // VERIFY: an order only counts once we find it in the shop's order list
      if (call.name === "place_order" && result.ok) {
        const ref = safeJson(call.arguments).taskId as string;
        const problems = await verifyOrder(store, ref);
        if (problems.length === 0) {
          const t = (await store.listTasks()).find((x) => x.ref === ref)!;
          await store.updateTask(t.id, { verified: true });
          await say("verify", `${ref} verified`, JSON.stringify({ ok: true, text: `${ref} · ${t.order!.shop} · ${rupees(t.order!.price)}` }));
          if (deps.pace) await sleep(deps.pace); // recording only (DEMO_PACE_MS): a short pause so a viewer can follow each order
        } else {
          await say("verify", `${ref} failed the check`, JSON.stringify({ ok: false, problems }));
          result = { ok: false, error: `Verification failed: ${problems.join(" ")} The shop said ordered, but it is not there. Order it again.` };
        }
      }

      await say("observe", call.name, observeText(call.name, result));
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }

    // CHECKPOINT: only now, when every tool call of this step has its answer. A half-finished step can't be resumed.
    await checkpoint();
  }
}

// RETRY: a timeout is not the model's fault. Our code waits a little and tries again.
async function withRetry(
  name: string,
  args: string,
  ctx: ExecCtx,
  say: (k: EventKind, t: string, d?: string) => unknown,
  sleep: (ms: number) => Promise<void>,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callTool(name, args, { ...ctx, attempt }, EXEC_TOOLS);
    } catch (e) {
      const why = e instanceof Error ? e.message : "tool failed";
      if (attempt >= MAX_RETRIES) return { ok: false, error: `${why}. Gave up after ${MAX_RETRIES} retries.` };
      const wait = 500 * 2 ** attempt; // 0.5 s, then 1 s
      await say("retry", `Retry ${attempt + 1} of ${MAX_RETRIES}`, `${why}. Trying again in ${wait / 1000} s.`);
      await sleep(wait);
    }
  }
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

function normalise(args: string) {
  const v = safeJson(args);
  return JSON.stringify(Object.keys(v).sort().map((k) => [k, v[k]]));
}

// What the phone shows: plain words, not JSON.
function actText(name: string, args: string) {
  const a = safeJson(args);
  if (name === "place_order") return `place_order(${a.taskId}, ${a.shop})`;
  return `${name}()`;
}

function observeText(name: string, r: Record<string, any>) {
  if (!r.ok) return `✕ ${r.error}`;
  if (name === "get_next_task") return nextText(r);
  if (name === "place_order") return `Ordered ${r.ordered}`;
  if (name === "check_orders") return `${r.orders.length} orders · ${rupees(r.spent)} spent · ${rupees(r.budgetLeft)} left`;
  return "ok";
}

function nextText(r: Record<string, any>) {
  if (r.allDone) return `Everything is ordered. ${rupees(r.budgetLeft)} left.`;
  const t = r.task;
  return `Next: ${t.id} · ${t.title} · about ${rupees(t.plannedCost)} · ${r.options.map((o: any) => `${o.shop} ${rupees(o.price)} ★${o.rating}`).join(", ")} · ${rupees(r.budgetLeft)} left`;
}
