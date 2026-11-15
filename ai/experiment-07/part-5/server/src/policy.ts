import { rupees } from "./shops";
import type { Grant, Kind, Policy } from "./types";

// Part 5: YOUR rules. The model never sees them as something it may bend: our code checks every order.
export const DEFAULT_POLICY: Policy = { maxAuto: 1000, alwaysAsk: [] };
export const APPROVAL_TTL_S = Number(process.env.APPROVAL_TTL_S || 120); // an unanswered question expires after this

export type Verdict = { ok: true; by: "rule" | "grant"; grant?: Grant } | { ok: false; reason: string };

// May the agent order this on its own?
export function checkOrder(policy: Policy, grants: Grant[], kind: Kind, price: number, now = new Date()): Verdict {
  const asks = policy.alwaysAsk.includes(kind)
    ? `Your rule: always ask before ordering ${kind}.`
    : price > policy.maxAuto
      ? `${rupees(price)} is above your limit of ${rupees(policy.maxAuto)}.`
      : null;
  if (!asks) return { ok: true, by: "rule" };
  // an earlier "yes to similar" still covers it?
  const g = grants.find((x) => new Date(x.expiresAt) > now && (x.kind === null || x.kind === kind) && price <= x.maxPrice);
  return g ? { ok: true, by: "grant", grant: g } : { ok: false, reason: asks };
}

// "Yes to similar today" lasts until midnight.
export function endOfDay(now = new Date()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 0);
  return d;
}

export function validPolicy(p: any): Policy | null {
  const kinds: Kind[] = ["cake", "food", "decor", "gift", "invite", "travel", "flight", "stay", "audio", "camera", "light", "gear", "other"];
  if (!p || typeof p !== "object") return null;
  const maxAuto = Number(p.maxAuto);
  if (!Number.isInteger(maxAuto) || maxAuto < 0 || maxAuto > 500_000) return null;
  const alwaysAsk = Array.isArray(p.alwaysAsk) ? p.alwaysAsk.filter((k: any) => kinds.includes(k)) : [];
  return { maxAuto, alwaysAsk: [...new Set(alwaysAsk)] as Kind[] };
}
