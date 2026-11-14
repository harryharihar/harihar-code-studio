import { today } from "./clock";
import type { LLM } from "./llm";
import { extractNotes, notesBlock } from "./memory";
import { PlanSchema, type Plan } from "./schemas";
import type { EventKind, Store } from "./types";

export const MAX_REPAIRS = 2;
export const LIMITS = { maxDays: 14, minTasks: 4, maxTasks: 10, maxBudget: 500_000 };

export function plannerInstructions(now = today()) {
  return `You are the planning engine of Mission Control. Turn the user's goal (a party, a picnic, any small event) into a plan of small tasks.
Today is ${now.weekday}, ${now.date}. Day 1 is today. The event itself is the last day.

Rules:
- days = the number of days from today until the event, counting both. If no day is given, 3.
- budget = the user's budget in rupees. If they said nothing, 5000.
- ${LIMITS.minTasks} to 8 tasks. Each task is ONE thing a shop can do: order a cake, snacks, decoration, return gifts, invitations, a cab.
- kind: cake, food, decor, gift, invite, travel or other.
- cost: a fair price in rupees for an Indian city. All costs together must stay at least 10% under the budget.
- day: when it must be done. Invitations early, the cake on the event day.
- priority "high" only for what the event cannot happen without: at most one task in three.
- Use dependsOn so the order is logical: send invitations after the cab or the venue is fixed, if the plan has one.
- A task can only depend on a task from the same day or an EARLIER day. No loops.
- If saved notes about the user come with the goal, the plan must respect them (e.g. vegetarian food, a favourite flavour).`;
}

// The schema can only say "dependsOn is a list of strings". It cannot say "those ids must exist"
// or "no loops". Our code checks the things a schema cannot.
export function checkPlan(plan: Plan): string[] {
  const problems: string[] = [];
  const byId = new Map(plan.tasks.map((t) => [t.id, t]));

  if (plan.tasks.length === 0) return ["The plan has no tasks."];
  if (plan.tasks.length < LIMITS.minTasks) problems.push(`Too few tasks (${plan.tasks.length}). Minimum is ${LIMITS.minTasks}.`);
  if (plan.tasks.length > LIMITS.maxTasks) problems.push(`Too many tasks (${plan.tasks.length}). Maximum is ${LIMITS.maxTasks}.`);
  if (!(plan.budget > 0) || plan.budget > LIMITS.maxBudget) problems.push(`budget must be 1 to ${LIMITS.maxBudget} rupees, got ${plan.budget}.`);
  if (!Number.isInteger(plan.days) || plan.days < 1 || plan.days > LIMITS.maxDays) problems.push(`days must be 1 to ${LIMITS.maxDays}, got ${plan.days}.`);
  if (byId.size !== plan.tasks.length) problems.push("Some task ids are used twice.");

  for (const t of plan.tasks) {
    if (!Number.isInteger(t.day) || t.day < 1 || t.day > plan.days) problems.push(`${t.id}: day ${t.day} is outside 1 to ${plan.days}.`);
    if (!Number.isInteger(t.cost) || t.cost < 0) problems.push(`${t.id}: cost must be a whole number of rupees, got ${t.cost}.`);
    for (const d of t.dependsOn) {
      const dep = byId.get(d);
      if (!dep) problems.push(`${t.id} depends on ${d}, which does not exist.`);
      else if (d === t.id) problems.push(`${t.id} depends on itself.`);
      else if (dep.day > t.day) problems.push(`${t.id} (day ${t.day}) depends on ${d}, which is planned later (day ${dep.day}).`);
    }
  }
  // the money check: a plan that already spends the whole budget leaves nothing for a surprise
  const total = plan.tasks.reduce((n, t) => n + (t.cost > 0 ? t.cost : 0), 0);
  if (plan.budget > 0 && total > plan.budget * 0.9) problems.push(`The tasks cost ₹${total}, more than 90% of the ₹${plan.budget} budget. Make it cheaper.`);

  const high = plan.tasks.filter((t) => t.priority === "high").length;
  const allowedHigh = Math.ceil(plan.tasks.length / 3);
  if (high > allowedHigh) problems.push(`${high} tasks are high priority. Maximum is ${allowedHigh}.`);

  if (findCycle(plan)) problems.push("The dependencies form a loop.");
  return problems;
}

function findCycle(plan: Plan) {
  const state = new Map<string, 1 | 2>(); // 1 = visiting, 2 = finished
  const deps = new Map(plan.tasks.map((t) => [t.id, t.dependsOn]));
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    for (const d of deps.get(id) ?? []) if (deps.has(d) && visit(d)) return true;
    state.set(id, 2);
    return false;
  };
  return plan.tasks.some((t) => visit(t.id));
}

// Execution order: a task only appears after everything it depends on.
// Among tasks that are ready, earlier days and higher priority go first.
export function orderPlan(plan: Plan): string[] {
  const rank = { high: 0, normal: 1, low: 2 };
  const left = new Set(plan.tasks.map((t) => t.id));
  const order: string[] = [];
  while (left.size) {
    const ready = plan.tasks
      .filter((t) => left.has(t.id) && t.dependsOn.every((d) => !left.has(d)))
      .sort((a, b) => a.day - b.day || rank[a.priority] - rank[b.priority]);
    if (ready.length === 0) break; // a loop: checkPlan would already have said so
    order.push(ready[0].id);
    left.delete(ready[0].id);
  }
  return order;
}

// Plan day numbers → real calendar dates. Day 1 = today.
export function dateOf(day: number, startDate = today().date) {
  const d = new Date(`${startDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day - 1);
  return d.toISOString().slice(0, 10);
}

type Step = (kind: EventKind, title: string, detail?: string) => unknown;

// Ask → check → if there are problems, show them to the model and ask again (at most twice) → order.
// Part 4: `memory` is the saved notes, put in front of the goal so the planner remembers the user.
export async function makePlan(goal: string, llm: LLM, step: Step = () => {}, memory = "") {
  const input0 = memory ? `${memory}\n\nGoal: ${goal}` : goal;
  const ask = (input: any) => llm.parse({ instructions: plannerInstructions(), input, schema: PlanSchema, name: "plan" });

  await step("ask", "Asking the model", "Fill our plan schema, nothing else.");
  let { data: plan } = await ask(input0);
  let problems = checkPlan(plan);
  await step("check", `${problems.length} problems`, JSON.stringify(problems));
  const fixed: string[] = [];

  for (let attempt = 0; attempt < MAX_REPAIRS && problems.length > 0; attempt++) {
    fixed.push(...problems);
    await step("repair", `Repair ${attempt + 1} of ${MAX_REPAIRS}`, "The model reads the problems and fixes its own plan.");
    const input = [
      { role: "user", content: input0 },
      { role: "assistant", content: JSON.stringify(plan) },
      { role: "user", content: `This plan has problems:\n${problems.map((p) => `- ${p}`).join("\n")}\nReturn the full corrected plan.` },
    ];
    plan = (await ask(input)).data;
    problems = checkPlan(plan);
    await step("check", `${problems.length} problems`, JSON.stringify(problems));
  }

  const order = orderPlan(plan);
  if (problems.length === 0) await step("order", "Order decided", JSON.stringify(order));
  return { plan, problems, fixed, order };
}

// Runs in the background, like the agent in Part 1. The phone polls and watches each step.
export async function runPlanner(runId: string, goal: string, deps: { llm: LLM; store: Store }) {
  const { llm, store } = deps;
  const say: Step = (kind, title, detail = "") => store.addEvent(runId, kind, title, detail);

  await say("goal", "Goal received", goal);

  // LONG-TERM MEMORY, part 1: read what we already know about the user
  const notes = await store.listNotes();
  if (notes.length) await say("memory", `Remembered ${notes.length} note${notes.length > 1 ? "s" : ""}`, notes.map((n) => n.content).join("\n"));

  const { plan, problems, fixed, order } = await makePlan(goal, llm, say, notesBlock(notes));
  if (problems.length > 0) {
    await say("error", "No valid plan", `The AI could not fix ${problems.length} problems after ${MAX_REPAIRS} repairs. Try again.`);
    await store.setStatus(runId, "failed");
    return;
  }
  await store.savePlan({ id: runId, plan, order, fixed, accepted: false, notes: notes.map((n) => n.content) });

  // LONG-TERM MEMORY, part 2: keep anything new worth remembering. A memory problem never blocks the plan.
  try {
    const added: string[] = [];
    for (const n of await extractNotes(goal, llm)) if (await store.addNote(n)) added.push(n);
    if (added.length) await say("memory", `Saved ${added.length} new note${added.length > 1 ? "s" : ""}`, added.join("\n"));
  } catch {
    /* the plan is ready anyway */
  }

  await say("final", "Plan ready", plan.summary);
  await store.setStatus(runId, "done");
}
