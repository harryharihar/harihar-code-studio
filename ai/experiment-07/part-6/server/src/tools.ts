import { z } from "zod";
import { zodResponsesFunction } from "openai/helpers/zod";
import { today } from "./clock";
import type { ToolDef } from "./llm";
import type { Store } from "./types";

// A tool = a name, a Zod schema for its arguments, and a function that does the work.
// The model never runs anything. It only asks; our code decides and runs.
export type Ctx = { store: Store; runId: string };

export type Tool<A = any, X = Ctx> = {
  name: string;
  description: string;
  schema: z.ZodType<A>;
  run(args: A, ctx: X): Promise<Record<string, unknown>>;
};

// Part 3: a failure that may go away if we simply try again (a timeout, a busy server).
// callTool lets it through, so the execution loop can retry. Every other error becomes an observation.
export class Transient extends Error {}

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const getToday: Tool = {
  name: "get_today",
  description: "Get today's date. Call this first, before you plan any dates.",
  schema: z.object({}),
  async run() {
    return { ok: true, ...today() };
  },
};

const createTask: Tool = {
  name: "create_task",
  description: "Put one task on the user's calendar.",
  schema: z.object({
    title: z.string().describe("A few words, e.g. 'React rendering and hooks'"),
    day: z.string().describe("YYYY-MM-DD, today or later"),
    minutes: z.number().describe("How long it takes, in minutes"),
    notes: z.string().describe("One line: what exactly to do"),
  }),
  async run(a, { store, runId }) {
    if (!DAY.test(a.day)) return { ok: false, error: "day must look like 2026-11-05" };
    if (a.day < today().date) return { ok: false, error: `${a.day} is in the past. Today is ${today().date}.` };
    const t = await store.addTask({ runId, title: a.title.trim().slice(0, 80), day: a.day, minutes: Math.round(a.minutes), notes: a.notes.trim().slice(0, 200) });
    return { ok: true, id: t.id, saved: `${t.day} · ${t.title}` };
  },
};

const listTasks: Tool = {
  name: "list_tasks",
  description: "See every task already on the calendar.",
  schema: z.object({}),
  async run(_a, { store }) {
    const tasks = await store.listTasks();
    return { ok: true, count: tasks.length, tasks: tasks.map((t) => `${t.day} · ${t.title} · ${t.minutes} min`) };
  },
};

export const TOOLS: Tool[] = [getToday, createTask, listTasks];

// Zod schema → the JSON the model understands.
export function toolDefs(tools: Tool<any, any>[] = TOOLS): ToolDef[] {
  return tools.map((t) => zodResponsesFunction({ name: t.name, description: t.description, parameters: t.schema }) as unknown as ToolDef);
}

// The model sends arguments as a string. Parse, check, run. Never throw: a mistake becomes an observation.
export async function callTool<X = Ctx>(name: string, rawArgs: string, ctx: X, tools: Tool<any, X>[] = TOOLS as any) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { ok: false, error: `unknown tool: ${name}` };
  let json: unknown;
  try {
    json = JSON.parse(rawArgs || "{}");
  } catch {
    return { ok: false, error: "arguments were not valid JSON" };
  }
  const parsed = tool.schema.safeParse(json);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  try {
    return await tool.run(parsed.data, ctx);
  } catch (e) {
    if (e instanceof Transient) throw e;
    return { ok: false, error: e instanceof Error ? e.message : "tool failed" };
  }
}
