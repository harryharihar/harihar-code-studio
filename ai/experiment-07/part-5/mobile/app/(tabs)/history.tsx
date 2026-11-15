import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { OS } from "../../src/components/os";
import { BrandHeader, Screen, type IconName } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { F } from "../../src/theme";
import type { RunSummary } from "../../src/types";

// Part 4: every run the agent ever made, read from PostgreSQL, on a glowing time rail.
const LOOK: Record<RunSummary["status"], { text: string; color: string; icon: IconName }> = {
  running: { text: "RUNNING", color: OS.cyan, icon: "sync" },
  done: { text: "DONE", color: OS.green, icon: "checkmark" },
  failed: { text: "STOPPED", color: OS.red, icon: "close" },
  interrupted: { text: "INTERRUPTED", color: OS.violetHi, icon: "pause" },
  waiting: { text: "NEEDS YOU", color: OS.amber, icon: "hand-left" },
};
const WHAT = { plan: "PLAN", execute: "SHOPPING RUN", agent: "AGENT RUN" } as const;

export default function History() {
  const router = useRouter();
  const { runs, loadRuns, openRun, resume } = useMission();
  useFocusEffect(useCallback(() => { loadRuns(); }, [loadRuns]));

  const open = async (r: RunSummary) => {
    if (r.kind !== "execute") return;
    await openRun(r.id);
    router.navigate("/run");
  };
  const counts = (["done", "waiting", "interrupted"] as const).map((k) => ({ k, n: runs.filter((r) => r.status === k).length }));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="SAVED IN POSTGRESQL" title="History" subtitle="Every run survives a restart. Tap a shopping run to replay it." />

        <View style={s.counts}>
          {counts.map(({ k, n }) => (
            <View key={k} style={[s.countBox, { borderColor: LOOK[k].color + "55" }]}>
              <Text style={[s.countNum, { color: LOOK[k].color }]}>{n}</Text>
              <Text style={s.countLabel}>{LOOK[k].text}</Text>
            </View>
          ))}
        </View>

        <View style={s.rail}>
          <View style={s.railLine} />
          {runs.length === 0 && <Text style={s.empty}>Nothing logged yet. Launch a mission first.</Text>}
          {runs.map((r) => {
            const st = LOOK[r.status] ?? LOOK.done;
            const d = new Date(r.createdAt);
            const canResume = r.status === "interrupted" && r.kind === "execute";
            return (
              <View key={r.id} style={s.entry}>
                <View style={[s.node, { borderColor: st.color, shadowColor: st.color }]}>
                  <Ionicons name={st.icon} size={13} color={st.color} />
                </View>
                <Pressable onPress={() => open(r)} style={({ pressed }) => [s.card, { borderColor: st.color + "38" }, pressed && r.kind === "execute" && { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                  <View style={s.cardTop}>
                    <Text style={s.when}>{d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[s.status, { color: st.color, borderColor: st.color + "77", backgroundColor: st.color + "16" }]}>{st.text}</Text>
                  </View>
                  <Text style={s.kind}>{WHAT[r.kind]}</Text>
                  <Text style={s.goal} numberOfLines={2}>{r.goal}</Text>
                  {!!r.last && <Text style={s.last} numberOfLines={1}>› {r.last}</Text>}
                  {canResume && (
                    <Pressable onPress={async () => { await resume(r.id); router.navigate("/run"); }} hitSlop={8} style={s.resume}>
                      <Ionicons name="play-forward" size={14} color="#0B0F1E" />
                      <Text style={s.resumeText}>Resume from checkpoint</Text>
                    </Pressable>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  counts: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 18 },
  countBox: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 10, alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)" },
  countNum: { fontSize: 24, fontWeight: "900" },
  countLabel: { color: OS.soft, fontSize: 9, fontWeight: "900", letterSpacing: 1.2, fontFamily: F.mono, marginTop: 2 },
  rail: { paddingLeft: 16, paddingRight: 16 },
  railLine: { position: "absolute", left: 30, top: 8, bottom: 8, width: 2, backgroundColor: "rgba(139,92,246,0.45)", shadowColor: OS.violet, shadowOpacity: 1, shadowRadius: 6 },
  empty: { color: OS.soft, fontSize: 14, fontWeight: "600", paddingVertical: 24, paddingLeft: 40 },
  entry: { flexDirection: "row", gap: 12, marginBottom: 12 },
  node: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, backgroundColor: "#0B0F1E", alignItems: "center", justifyContent: "center", marginTop: 10, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  card: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(255,255,255,0.045)" },
  cardTop: { flexDirection: "row", alignItems: "center" },
  when: { color: OS.soft, fontSize: 11.5, fontWeight: "800", fontFamily: F.mono },
  status: { fontSize: 9.5, fontWeight: "900", letterSpacing: 1.1, fontFamily: F.mono, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  kind: { color: OS.violetHi, fontSize: 10, fontWeight: "900", letterSpacing: 1.6, fontFamily: F.mono, marginTop: 8 },
  goal: { color: OS.text, fontSize: 15, fontWeight: "800", lineHeight: 20, marginTop: 2 },
  last: { color: OS.faint, fontSize: 11.5, fontWeight: "700", marginTop: 6, fontFamily: F.mono },
  resume: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: OS.cyan, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 },
  resumeText: { color: "#0B0F1E", fontSize: 12.5, fontWeight: "900" },
});
