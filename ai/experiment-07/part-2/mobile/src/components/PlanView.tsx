import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { C, F } from "../theme";
import type { PlanResult, PlanTask } from "../types";
import { Card, SectionTitle, type IconName } from "./ui";

const KIND_ICON: Record<PlanTask["kind"], IconName> = { learn: "book-outline", practice: "hammer-outline", mock: "mic-outline", review: "search-outline", rest: "leaf-outline" };
const PRIORITY = {
  high: { color: C.orange, soft: C.orangeSoft },
  normal: { color: C.inkSoft, soft: C.paperDeep },
  low: { color: C.green, soft: C.greenSoft },
};

// The plan the AI made: four numbers and the checker's verdict, then one card per day.
export function PlanView({ result }: { result: PlanResult }) {
  const { plan, order, fixed } = result;
  const minutes = plan.tasks.reduce((n, t) => n + t.minutes, 0);
  const high = plan.tasks.filter((t) => t.priority === "high").length;
  const days = [...new Set(plan.tasks.map((t) => t.day))].sort((a, b) => a - b);
  const stats = [
    { label: "tasks", value: String(plan.tasks.length), color: C.green },
    { label: "hours", value: (minutes / 60).toFixed(1).replace(/\.0$/, ""), color: C.indigo },
    { label: "days", value: String(days.length), color: C.plum },
    { label: "high priority", value: String(high), color: C.orange },
  ];

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <SectionTitle>The plan</SectionTitle>
        <Text style={s.summary}>{plan.summary}</Text>
        <View style={s.stats}>
          {stats.map((x, i) => (
            <View key={x.label} style={[s.stat, i > 0 && s.statDivider]}>
              <Text style={[s.statValue, { color: x.color }]}>{x.value}</Text>
              <Text style={s.statLabel}>{x.label}</Text>
            </View>
          ))}
        </View>
        <View style={[s.verdict, { backgroundColor: fixed.length ? C.plumSoft : C.greenSoft }]}>
          <Ionicons name="shield-checkmark" size={16} color={fixed.length ? C.plum : C.green} />
          <Text style={[s.verdictText, { color: fixed.length ? C.plum : C.green }]}>
            {fixed.length ? `Checked · the AI fixed ${fixed.length} ${fixed.length === 1 ? "problem" : "problems"} on its own` : "Checked · 0 problems"}
          </Text>
        </View>
      </Card>

      {days.map((d) => {
        const list = plan.tasks.filter((t) => t.day === d);
        return (
          <Card key={d}>
            <SectionTitle right={<Text style={s.dayMin}>{list.reduce((n, t) => n + t.minutes, 0)} min</Text>}>Day {d}</SectionTitle>
            <View style={{ gap: 14 }}>
              {list.map((t) => (
                <View key={t.id} style={s.task}>
                  <View style={s.icon}>
                    <Ionicons name={KIND_ICON[t.kind]} size={18} color={C.inkSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{t.title}</Text>
                    <Text style={s.why}>{t.why}</Text>
                    <View style={s.chips}>
                      <View style={[s.chip, { backgroundColor: C.ink }]}>
                        <Text style={[s.chipText, { color: C.paper, fontFamily: F.mono }]}>{t.id}</Text>
                      </View>
                      <View style={[s.chip, { backgroundColor: PRIORITY[t.priority].soft }]}>
                        <Text style={[s.chipText, { color: PRIORITY[t.priority].color }]}>{t.priority}</Text>
                      </View>
                      <View style={[s.chip, { backgroundColor: C.paperDeep }]}>
                        <Text style={[s.chipText, { color: C.inkSoft }]}>{t.minutes} min</Text>
                      </View>
                      {t.dependsOn.length > 0 && (
                        <View style={[s.chip, { backgroundColor: C.indigoSoft }]}>
                          <Text style={[s.chipText, { color: C.indigo }]}>after {t.dependsOn.join(", ")}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={s.order}>#{order.indexOf(t.id) + 1}</Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  summary: { color: C.inkSoft, fontSize: 14.5, lineHeight: 21 },
  stats: { flexDirection: "row", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { borderLeftWidth: 1, borderLeftColor: C.line },
  statValue: { fontFamily: F.serif, fontSize: 28, fontWeight: "700" },
  statLabel: { color: C.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  verdict: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginTop: 16 },
  verdictText: { flex: 1, fontSize: 13.5, fontWeight: "800" },
  dayMin: { color: C.muted, fontSize: 12, fontWeight: "700" },
  task: { flexDirection: "row", gap: 12 },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  title: { color: C.ink, fontSize: 15.5, fontWeight: "800", lineHeight: 20 },
  why: { color: C.muted, fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "800" },
  order: { color: C.faint, fontSize: 12, fontWeight: "800" },
});
