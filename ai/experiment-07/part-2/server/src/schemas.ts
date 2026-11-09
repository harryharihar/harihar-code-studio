import { z } from "zod";

// Part 2: the SHAPE of a plan. The model must fill exactly this, nothing else.
// .describe() text goes to the model, so it works like a tiny instruction for each field.
export const PlanTask = z.object({
  id: z.string().describe('Short unique id: "t1", "t2", "t3" …'),
  title: z.string().describe("A few words, e.g. 'FlatList performance'"),
  why: z.string().describe("One line: why this task matters for the goal"),
  day: z.number().describe("Day number. 1 = first day"),
  minutes: z.number().describe("How long it takes, in minutes"),
  priority: z.enum(["high", "normal", "low"]),
  kind: z.enum(["learn", "practice", "mock", "review", "rest"]),
  dependsOn: z.array(z.string()).describe("ids of tasks that must be finished before this one. [] if none"),
});

export const PlanSchema = z.object({
  goal: z.string().describe("The goal in one clear sentence"),
  summary: z.string().describe("Two short sentences: the strategy of this plan"),
  days: z.number().describe("How many days the plan covers"),
  tasks: z.array(PlanTask),
});

export type PlanTask = z.infer<typeof PlanTask>;
export type Plan = z.infer<typeof PlanSchema>;
