// Lab 5: no AI here. We hand-make a BAD plan to see what the checker catches.
import { checkPlan } from "../src/plan";

const t = (id: string, day: number, dependsOn: string[] = [], minutes = 60) => ({
  id, title: id, why: "", day, minutes, priority: "normal" as const, kind: "learn" as const, dependsOn,
});
const bad = { goal: "g", summary: "s", days: 7, tasks: [t("t1", 1, ["t9"]), t("t2", 2, ["t3"]), t("t3", 5), t("t4", 9), t("t5", 3, [], 500)] };

console.log("The schema says this plan is FINE (every field has the right type).\nOur checker says:\n");
for (const p of checkPlan(bad)) console.log(" ✗", p);
