import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { C, F } from "../theme";
import type { PlanResult, PlanTask } from "../types";
import { Glass, IconTile, OS } from "./os";
import type { IconName } from "./ui";

export const KIND_ICON: Record<PlanTask["kind"], IconName> = { cake: "ice-cream-outline", food: "fast-food-outline", decor: "color-palette-outline", gift: "gift-outline", invite: "mail-outline", travel: "car-outline", flight: "airplane-outline", stay: "bed-outline", audio: "mic-outline", camera: "camera-outline", light: "bulb-outline", gear: "construct-outline", other: "bag-handle-outline" };
// every kind of task has its own neon colour, so a plan reads at a glance
export const KIND_COLOR: Record<PlanTask["kind"], { color: string; soft: string; label: string }> = {
  cake: { color: "#F472B6", soft: "#331328", label: "Cake" },
  food: { color: "#FB923C", soft: "#2E1A0E", label: "Food" },
  decor: { color: "#E879F9", soft: "#2E1233", label: "Decoration" },
  gift: { color: "#34D399", soft: "#0D2B23", label: "Gift" },
  invite: { color: "#22D3EE", soft: "#0A2830", label: "Invitation" },
  travel: { color: "#2DD4BF", soft: "#0B2B28", label: "Travel" },
  flight: { color: "#38BDF8", soft: "#0A2638", label: "Flight" },
  stay: { color: "#A3E635", soft: "#1C2A0B", label: "Stay" },
  audio: { color: "#FB7185", soft: "#3A1219", label: "Audio" },
  camera: { color: "#A78BFA", soft: "#231B45", label: "Camera" },
  light: { color: "#FBBF24", soft: "#2E2310", label: "Lights" },
  gear: { color: "#FDBA74", soft: "#2E1C0E", label: "Gear" },
  other: { color: C.inkSoft, soft: C.paperDeep, label: "Other" },
};
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// The plan the AI made: a memory recall, four neon numbers and the checker's verdict, then the manifest day by day.
export function PlanView({ result }: { result: PlanResult }) {
  const { plan, fixed } = result;
  const cost = plan.tasks.reduce((n, t) => n + t.cost, 0);
  const high = plan.tasks.filter((t) => t.priority === "high").length;
  const days = [...new Set(plan.tasks.map((t) => t.day))].sort((a, b) => a - b);
  const left = plan.budget - cost;
  const pct = Math.min(100, (cost / Math.max(plan.budget, 1)) * 100);
  const stats: { label: string; value: string; color: string; icon: IconName }[] = [
    { label: "TASKS", value: String(plan.tasks.length), color: OS.cyan, icon: "list" },
    { label: "PLANNED", value: rupees(cost), color: OS.violetHi, icon: "wallet" },
    { label: "BUDGET", value: rupees(plan.budget), color: OS.pink, icon: "cash" },
    { label: "MUST-HAVE", value: String(high), color: OS.amber, icon: "star" },
  ];

  return (
    <View style={{ gap: 14 }}>
      {/* Part 4: what the agent remembered from earlier plans */}
      {result.notes?.length > 0 && (
        <Glass glow={OS.cyan} style={{ gap: 6 }}>
          <View style={s.recallHead}>
            <Ionicons name="sparkles" size={16} color={OS.cyan} />
            <Text style={s.recallTitle}>RECALLED FROM MEMORY</Text>
          </View>
          {result.notes.map((n) => (
            <Text key={n} style={s.recallNote}>› {n.replace(/\.$/, "")}</Text>
          ))}
          <Text style={s.recallSub}>You didn’t type this today. The agent remembered.</Text>
        </Glass>
      )}

      <Glass>
        <Text style={s.kicker}>MISSION PLAN</Text>
        <Text style={s.summary}>{plan.summary}</Text>
        <View style={s.grid}>
          {stats.map((x) => (
            <View key={x.label} style={[s.tile, { borderColor: x.color + "55", backgroundColor: x.color + "12" }]}>
              <Ionicons name={x.icon} size={15} color={x.color} />
              <Text style={[s.tileValue, { color: x.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{x.value}</Text>
              <Text style={s.tileLabel}>{x.label}</Text>
            </View>
          ))}
        </View>
        <View style={s.track}>
          <LinearGradient colors={["#8B5CF6", "#EC4899", "#22D3EE"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={s.trackNote}>{rupees(cost)} planned · {rupees(Math.max(left, 0))} kept free for surprises</Text>
        <View style={[s.verdict, { borderColor: (fixed.length ? OS.pink : OS.green) + "66", backgroundColor: (fixed.length ? OS.pink : OS.green) + "14" }]}>
          <Ionicons name="shield-checkmark" size={16} color={fixed.length ? OS.pink : OS.green} />
          <Text style={[s.verdictText, { color: fixed.length ? OS.pink : OS.green }]}>
            {fixed.length ? `Checked by our code · the AI fixed ${fixed.length} ${fixed.length === 1 ? "problem" : "problems"}` : "Checked by our code · 0 problems"}
          </Text>
        </View>
      </Glass>

      {/* the manifest: every task, grouped by day */}
      <Glass>
        <Text style={s.kicker}>MANIFEST</Text>
        <Text style={s.goal} numberOfLines={2}>{plan.goal}</Text>
        {days.map((d) => {
          const list = plan.tasks.filter((t) => t.day === d);
          const date = dateFor(d);
          return (
            <View key={d} style={{ marginTop: 16 }}>
              <View style={s.dayRow}>
                <Text style={s.dayChip}>DAY {d}</Text>
                <Text style={s.dayDate}>{date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</Text>
                <View style={s.dayLine} />
              </View>
              {list.map((t) => <Item key={t.id} t={t} all={plan.tasks} />)}
            </View>
          );
        })}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalValue}>{rupees(cost)}</Text>
        </View>
      </Glass>
    </View>
  );
}

const dateFor = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d - 1); return x; };

function Item({ t, all }: { t: PlanTask; all: PlanTask[] }) {
  const k = KIND_COLOR[t.kind] ?? KIND_COLOR.other;
  const after = t.dependsOn.map((id) => all.find((x) => x.id === id)?.title.toLowerCase()).filter(Boolean);
  return (
    <View style={s.item}>
      <IconTile icon={KIND_ICON[t.kind] ?? "bag-handle-outline"} color={k.color} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>{t.title}{t.priority === "high" ? <Text style={{ color: OS.amber }}>  ★</Text> : null}</Text>
        <Text style={s.why} numberOfLines={2}>{t.why}{after.length ? `  ·  after ${after.join(", ")}` : ""}</Text>
      </View>
      <Text style={[s.price, { color: t.cost ? k.color : OS.green }]}>{t.cost ? rupees(t.cost) : "FREE"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  recallHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  recallTitle: { color: OS.cyan, fontSize: 11.5, fontWeight: "900", letterSpacing: 1.8, fontFamily: F.mono },
  recallNote: { color: OS.text, fontSize: 17, fontWeight: "800", lineHeight: 24 },
  recallSub: { color: OS.soft, fontSize: 12, fontWeight: "600" },
  kicker: { color: OS.violetHi, fontSize: 11, fontWeight: "900", letterSpacing: 2.2, fontFamily: F.mono },
  summary: { color: OS.text, fontSize: 15, lineHeight: 22, fontWeight: "600", marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  tile: { width: "48.5%", borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  tileValue: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  tileLabel: { color: OS.soft, fontSize: 10, fontWeight: "900", letterSpacing: 1.4, fontFamily: F.mono },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden", marginTop: 14 },
  fill: { height: 8, borderRadius: 4 },
  trackNote: { color: OS.soft, fontSize: 12, fontWeight: "700", marginTop: 6 },
  verdict: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, marginTop: 12 },
  verdictText: { flex: 1, fontSize: 13, fontWeight: "800" },
  goal: { color: OS.soft, fontSize: 13, fontWeight: "600", marginTop: 4, lineHeight: 18 },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  dayChip: { color: "#0B0F1E", backgroundColor: OS.cyan, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.2, fontFamily: F.mono, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: "hidden" },
  dayDate: { color: OS.text, fontSize: 13, fontWeight: "800" },
  dayLine: { flex: 1, height: 1, backgroundColor: "rgba(34,211,238,0.25)" },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  title: { color: OS.text, fontSize: 15, fontWeight: "800", lineHeight: 20 },
  why: { color: OS.soft, fontSize: 12, lineHeight: 16, marginTop: 2 },
  price: { fontSize: 15, fontWeight: "900", fontFamily: F.mono },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(167,139,250,0.3)", marginTop: 12, paddingTop: 12 },
  totalLabel: { color: OS.soft, fontSize: 12, fontWeight: "900", letterSpacing: 2, fontFamily: F.mono },
  totalValue: { color: OS.text, fontSize: 22, fontWeight: "900", fontFamily: F.mono },
});
