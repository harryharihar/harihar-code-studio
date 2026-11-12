import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { C, F } from "../theme";
import type { PlanResult, PlanTask } from "../types";
import { Card, type IconName } from "./ui";

export const KIND_ICON: Record<PlanTask["kind"], IconName> = { cake: "ice-cream-outline", food: "fast-food-outline", decor: "color-palette-outline", gift: "gift-outline", invite: "mail-outline", travel: "car-outline", other: "bag-handle-outline" };
// every kind of task has its own colour, so a plan reads at a glance
export const KIND_COLOR: Record<PlanTask["kind"], { color: string; soft: string; label: string }> = {
  cake: { color: "#D63A7C", soft: "#FCE4EF", label: "Cake" },
  food: { color: C.orange, soft: C.orangeSoft, label: "Food" },
  decor: { color: C.plum, soft: C.plumSoft, label: "Decoration" },
  gift: { color: C.green, soft: C.greenSoft, label: "Gift" },
  invite: { color: C.indigo, soft: C.indigoSoft, label: "Invitation" },
  travel: { color: "#0E7C86", soft: "#DDF1F2", label: "Travel" },
  other: { color: C.inkSoft, soft: C.paperDeep, label: "Other" },
};
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// The plan the AI made: four numbers and the checker's verdict, then the days, one colourful card per task.
export function PlanView({ result }: { result: PlanResult }) {
  const { plan, order, fixed } = result;
  const cost = plan.tasks.reduce((n, t) => n + t.cost, 0);
  const high = plan.tasks.filter((t) => t.priority === "high").length;
  const days = [...new Set(plan.tasks.map((t) => t.day))].sort((a, b) => a - b);
  const stats = [
    { label: "tasks", value: String(plan.tasks.length), color: C.green },
    { label: "planned", value: rupees(cost), color: C.indigo },
    { label: "budget", value: rupees(plan.budget), color: C.plum },
    { label: "must-have", value: String(high), color: C.orange },
  ];
  const left = plan.budget - cost;

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Text style={s.cardTitle}>The plan</Text>
        <Text style={s.summary}>{plan.summary}</Text>
        <View style={s.stats}>
          {stats.map((x, i) => (
            <View key={x.label} style={[s.stat, i > 0 && s.statDivider]}>
              <Text style={[s.statValue, { color: x.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{x.value}</Text>
              <Text style={s.statLabel} numberOfLines={1}>{x.label}</Text>
            </View>
          ))}
        </View>
        <View style={s.budgetTrack}><View style={[s.budgetFill, { width: `${Math.min(100, (cost / Math.max(plan.budget, 1)) * 100)}%` }]} /></View>
        <Text style={s.budgetNote}>{rupees(cost)} planned · {rupees(Math.max(left, 0))} kept free for surprises</Text>
        <View style={[s.verdict, { backgroundColor: fixed.length ? C.plumSoft : C.greenSoft }]}>
          <Ionicons name="shield-checkmark" size={16} color={fixed.length ? C.plum : C.green} />
          <Text style={[s.verdictText, { color: fixed.length ? C.plum : C.green }]}>
            {fixed.length ? `Checked · the AI fixed ${fixed.length} ${fixed.length === 1 ? "problem" : "problems"} on its own` : "Checked · 0 problems"}
          </Text>
        </View>
      </Card>

      {/* the plan as a printed party menu: a date per day, and a dotted line to every price */}
      <View style={s.menu}>
        <Text style={s.menuTitle}>The party list</Text>
        <Text style={s.menuSub}>{plan.goal}</Text>
        {days.map((d, i) => {
          const list = plan.tasks.filter((t) => t.day === d);
          const party = d === plan.days;
          const date = dateFor(d);
          return (
            <View key={d} style={[s.day, i > 0 && s.dayRule]}>
              <View style={s.dateCol}>
                <View style={[s.dateDisc, party && s.partyDisc]}>
                  <Text style={[s.dateNum, party && { color: "#fff" }]}>{date.getDate()}</Text>
                </View>
                <Text style={[s.weekday, party && { color: C.orange }]}>{party ? "Party!" : date.toLocaleDateString("en-IN", { weekday: "short" })}</Text>
              </View>
              <View style={{ flex: 1, gap: 14 }}>
                {list.map((t) => <Line key={t.id} t={t} all={plan.tasks} />)}
              </View>
            </View>
          );
        })}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.leader} numberOfLines={1}>{DOTS}</Text>
          <Text style={s.totalValue}>{rupees(cost)}</Text>
        </View>
        <Text style={s.totalNote}>of your {rupees(plan.budget)} budget · {rupees(Math.max(left, 0))} kept free for surprises</Text>
      </View>
    </View>
  );
}

const DOTS = "· ".repeat(60);
const dateFor = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d - 1); return x; };

function Line({ t, all }: { t: PlanTask; all: PlanTask[] }) {
  const k = KIND_COLOR[t.kind] ?? KIND_COLOR.other;
  const after = t.dependsOn.map((id) => all.find((x) => x.id === id)?.title.toLowerCase()).filter(Boolean);
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={[s.dot, { backgroundColor: k.color }]}>
        <Ionicons name={KIND_ICON[t.kind] ?? "bag-handle-outline"} size={14} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.lineTop}>
          <Text style={s.title} numberOfLines={2}>{t.title}{t.priority === "high" ? <Text style={s.star}>  ★</Text> : null}</Text>
          <Text style={s.leader} numberOfLines={1}>{DOTS}</Text>
          <Text style={[s.price, { color: t.cost ? C.ink : C.green }]}>{t.cost ? rupees(t.cost) : "free"}</Text>
        </View>
        <Text style={s.why}>{t.why}{after.length ? `  ·  after ${after.join(", ")}` : ""}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cardTitle: { color: C.ink, fontFamily: F.serif, fontSize: 22, fontWeight: "700", marginBottom: 8 },
  summary: { color: C.inkSoft, fontSize: 14.5, lineHeight: 21 },
  stats: { flexDirection: "row", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: C.line },
  statValue: { fontFamily: F.serif, fontSize: 22, fontWeight: "700" },
  statLabel: { color: C.muted, fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 2 },
  budgetTrack: { height: 8, borderRadius: 4, backgroundColor: C.paperDeep, overflow: "hidden", marginTop: 16 },
  budgetFill: { height: 8, borderRadius: 4, backgroundColor: C.indigo },
  budgetNote: { color: C.muted, fontSize: 12, fontWeight: "700", marginTop: 6 },
  verdict: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginTop: 14 },
  verdictText: { flex: 1, fontSize: 13.5, fontWeight: "800" },

  menu: { backgroundColor: C.card, borderRadius: 6, paddingVertical: 22, paddingHorizontal: 18, borderWidth: 1, borderColor: C.line, shadowColor: "#3A2A14", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  menuTitle: { color: C.ink, fontFamily: F.serif, fontSize: 26, fontWeight: "700", fontStyle: "italic", textAlign: "center" },
  menuSub: { color: C.muted, fontSize: 12.5, textAlign: "center", marginTop: 4, marginBottom: 6, fontStyle: "italic" },
  day: { flexDirection: "row", gap: 14, paddingTop: 18, paddingBottom: 4 },
  dayRule: { borderTopWidth: 1, borderTopColor: C.line, borderStyle: "dashed", marginTop: 14 },
  dateCol: { width: 54, alignItems: "center" },
  dateDisc: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: C.ink, alignItems: "center", justifyContent: "center" },
  partyDisc: { backgroundColor: C.orange, borderColor: C.orange, transform: [{ rotate: "-6deg" }] },
  dateNum: { color: C.ink, fontFamily: F.serif, fontSize: 24, fontWeight: "700" },
  weekday: { color: C.muted, fontSize: 11.5, fontWeight: "800", marginTop: 5 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
  lineTop: { flexDirection: "row", alignItems: "flex-end" },
  title: { color: C.ink, fontSize: 15.5, fontWeight: "700", lineHeight: 20, flexShrink: 1 },
  star: { color: C.orange, fontSize: 14 },
  leader: { flex: 1, color: C.faint, fontSize: 13, marginHorizontal: 6, minWidth: 18, overflow: "hidden" },
  price: { fontFamily: F.serif, fontSize: 17, fontWeight: "700" },
  why: { color: C.muted, fontSize: 12.5, lineHeight: 17, marginTop: 3, fontStyle: "italic" },
  totalRow: { flexDirection: "row", alignItems: "flex-end", borderTopWidth: 1.5, borderTopColor: C.ink, marginTop: 18, paddingTop: 14 },
  totalLabel: { color: C.ink, fontFamily: F.serif, fontSize: 20, fontWeight: "700" },
  totalValue: { color: C.ink, fontFamily: F.serif, fontSize: 22, fontWeight: "700" },
  totalNote: { color: C.muted, fontSize: 12, fontWeight: "600", textAlign: "right", marginTop: 4 },
});
