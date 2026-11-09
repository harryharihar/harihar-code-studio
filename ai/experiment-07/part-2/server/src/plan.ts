import { today } from "./clock";
import type { LLM } from "./llm";
import { PlanSchema, type Plan } from "./schemas";
import type { EventKind, Store } from "./types";

export const MAX_REPAIRS = 2;
export const LIMITS = { maxDays: 14, minMinutes: 15, maxTaskMinutes: 180, maxDayMinutes: 240, maxTasks: 24 };

export function plannerInstructions(now = today()) {
  return `You are the planning engine of Mission Control. Turn the user's goal into a plan of small tasks.
Today is ${now.weekday}, ${now.date}. Day 1 is today.

Rules:
- Cover exactly the number of days the user asked for (default 7, never more than ${LIMITS.maxDays}).
- Daily time: use what the user said. If they said nothing, about 120 minutes a day. Never more than ${LIMITS.maxDayMinutes} minutes in one day.
- 6 to 14 tasks. Each task is ${LIMITS.minMinutes} to ${LIMITS.maxTaskMinutes} minutes.
- priority "high" only for the topics that decide the result: at most one task in three.
- Use dependsOn so the order is logical: practice comes after the matching learn task, a mock after the topics it tests.
- A task can only depend on a task from the same day or an EARLIER day. No loops.
- The last day ends with a mock or a review.`;
}

// The schema can only say "dependsOn is a list of strings". It cannot say "those ids must exist"
// or "no loops". Our code checks the things a schema cannot.
export function checkPlan(plan: Plan): string[] {
  const problems: string[] = [];
  const byId = new Map(plan.tasks.map((t) => [t.id, t]));

  if (plan.tasks.length === 0) return ["The plan has no tasks."];
  if (plan.tasks.length > LIMITS.maxTasks) problems.push(`Too many tasks (${plan.tasks.length}). Maximum is ${LIMITS.maxTasks}.`);
  if (!Number.isInteger(plan.days) || plan.days < 1 || plan.days > LIMITS.maxDays) problems.push(`days must be 1 to ${LIMITS.maxDays}, got ${plan.days}.`);
  if (byId.size !== plan.tasks.length) problems.push("Some task ids are used twice.");

  const perDay = new Map<number, number>();
  for (const t of plan.tasks) {
    if (!Number.isInteger(t.day) || t.day < 1 || t.day > plan.days) problems.push(`${t.id}: day ${t.day} is outside 1 to ${plan.days}.`);
    if (t.minutes < LIMITS.minMinutes || t.minutes > LIMITS.maxTaskMinutes) problems.push(`${t.id}: ${t.minutes} minutes is not between ${LIMITS.minMinutes} and ${LIMITS.maxTaskMinutes}.`);
    perDay.set(t.day, (perDay.get(t.day) ?? 0) + t.minutes);
    for (const d of t.dependsOn) {
      const dep = byId.get(d);
      if (!dep) problems.push(`${t.id} depends on ${d}, which does not exist.`);
      else if (d === t.id) problems.push(`${t.id} depends on itself.`);
      else if (dep.day > t.day) problems.push(`${t.id} (day ${t.day}) depends on ${d}, which is planned later (day ${dep.day}).`);
    }
  }
  for (const [day, min] of perDay) if (min > LIMITS.maxDayMinutes) problems.push(`Day ${day} has ${min} minutes. Maximum is ${LIMITS.maxDayMinutes}.`);

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
export async function makePlan(goal: string, llm: LLM, step: Step = () => {}) {
  const ask = (input: any) => llm.parse({ instructions: plannerInstructions(), input, schema: PlanSchema, name: "plan" });

  await step("ask", "Asking the model", "Fill our plan schema, nothing else.");
  let { data: plan } = await ask(goal);
  let problems = checkPlan(plan);
  await step("check", `${problems.length} problems`, JSON.stringify(problems));
  const fixed: string[] = [];

  for (let attempt = 0; attempt < MAX_REPAIRS && problems.length > 0; attempt++) {
    fixed.push(...problems);
    await step("repair", `Repair ${attempt + 1} of ${MAX_REPAIRS}`, "The model reads the problems and fixes its own plan.");
    const input = [
      { role: "user", content: goal },
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
  const { plan, problems, fixed, order } = await makePlan(goal, llm, say);
  if (problems.length > 0) {
    await say("error", "No valid plan", `The AI could not fix ${problems.length} problems after ${MAX_REPAIRS} repairs. Try again.`);
    await store.setStatus(runId, "failed");
    return;
  }
  await store.savePlan({ id: runId, plan, order, fixed, accepted: false });
  await say("final", "Plan ready", plan.summary);
  await store.setStatus(runId, "done");
}
