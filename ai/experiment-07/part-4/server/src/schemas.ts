import { z } from "zod";

// Part 2: the SHAPE of a plan. The model must fill exactly this, nothing else.
// .describe() text goes to the model, so it works like a tiny instruction for each field.
// Part 3: a plan is now a party (or any event): small things to order or arrange, each with a price.
export const PlanTask = z.object({
  id: z.string().describe('Short unique id: "t1", "t2", "t3" …'),
  title: z.string().describe("A few words, e.g. 'Order the birthday cake'"),
  why: z.string().describe("One line: why this task matters for the event"),
  day: z.number().describe("Day number by which it must be done. 1 = today. The event itself is the last day"),
  cost: z.number().describe("Estimated cost in rupees, a whole number. 0 if it is free"),
  priority: z.enum(["high", "normal", "low"]),
  kind: z.enum(["cake", "food", "decor", "gift", "invite", "travel", "other"]),
  dependsOn: z.array(z.string()).describe("ids of tasks that must be done before this one. [] if none"),
});

export const PlanSchema = z.object({
  goal: z.string().describe("The goal in one clear sentence"),
  summary: z.string().describe("Two short sentences: the strategy of this plan"),
  days: z.number().describe("How many days from today until the event, counting today and the event day"),
  budget: z.number().describe("The user's total budget in rupees. 5000 if they did not say"),
  tasks: z.array(PlanTask),
});

export type PlanTask = z.infer<typeof PlanTask>;
export type Plan = z.infer<typeof PlanSchema>;
