import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandHeader, Screen } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { C, F } from "../../src/theme";
import type { RunSummary } from "../../src/types";

// Part 4: every run the agent ever made, read from PostgreSQL. Drawn as a logbook:
// one ruled row per run, the time on the left, and an ink stamp for how it ended.
const STAMP: Record<RunSummary["status"], { text: string; color: string; tilt: string }> = {
  running: { text: "RUNNING", color: C.orange, tilt: "-4deg" },
  done: { text: "DONE", color: C.green, tilt: "-6deg" },
  failed: { text: "STOPPED", color: C.red, tilt: "-5deg" },
  interrupted: { text: "INTERRUPTED", color: C.indigo, tilt: "-4deg" },
};
const WHAT = { plan: "Plan", execute: "Ordering run", agent: "Agent run" } as const;

export default function History() {
  const router = useRouter();
  const { runs, loadRuns, openRun, resume } = useMission();
  useFocusEffect(useCallback(() => { loadRuns(); }, [loadRuns]));

  const open = async (r: RunSummary) => {
    if (r.kind !== "execute") return;
    await openRun(r.id);
    router.navigate("/run");
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="SAVED IN POSTGRESQL" title="History" subtitle="Every run is kept, even after a restart" />

        <View style={s.book}>
          <View style={s.headRow}>
            <Text style={[s.headText, { width: 64 }]}>WHEN</Text>
            <Text style={[s.headText, { flex: 1 }]}>WHAT</Text>
            <Text style={s.headText}>RESULT</Text>
          </View>

          {runs.length === 0 && <Text style={s.empty}>Nothing logged yet. Make a plan on the Mission tab.</Text>}

          {runs.map((r, i) => {
            const st = STAMP[r.status] ?? STAMP.done;
            const d = new Date(r.createdAt);
            const canResume = r.status === "interrupted" && r.kind === "execute";
            return (
              <Pressable key={r.id} onPress={() => open(r)} style={({ pressed }) => [s.row, i === runs.length - 1 && { borderBottomWidth: 0 }, pressed && r.kind === "execute" && { backgroundColor: "#F7F0E2" }]}>
                <View style={s.when}>
                  <Text style={s.day}>{d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                  <Text style={s.time}>{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={s.kind}>{WHAT[r.kind]}</Text>
                  <Text style={s.goal} numberOfLines={2}>{r.goal}</Text>
                  {!!r.last && <Text style={s.last} numberOfLines={1}>last step · {r.last}</Text>}
                  {canResume && (
                    <Pressable onPress={async () => { await resume(r.id); router.navigate("/run"); }} hitSlop={8}>
                      <Text style={s.resume}>Resume from checkpoint ▸</Text>
                    </Pressable>
                  )}
                </View>
                <View style={[s.stamp, { borderColor: st.color, transform: [{ rotate: st.tilt }] }]}>
                  <Text style={[s.stampText, { color: st.color }]}>{st.text}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  book: {
    marginHorizontal: 16, backgroundColor: "#FFFDF8", borderRadius: 4, paddingHorizontal: 14,
    shadowColor: "#3A2A14", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  headRow: { flexDirection: "row", alignItems: "center", paddingTop: 14, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: C.ink },
  headText: { color: C.muted, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.4 },
  empty: { color: C.muted, fontSize: 14, fontWeight: "600", paddingVertical: 24, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: "dashed" },
  when: { width: 64 },
  day: { color: C.ink, fontSize: 13.5, fontWeight: "800" },
  time: { color: C.muted, fontSize: 11.5, fontWeight: "700", marginTop: 2, fontVariant: ["tabular-nums"] },
  kind: { color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  goal: { color: C.ink, fontFamily: F.serif, fontSize: 16, fontWeight: "700", lineHeight: 21, marginTop: 2 },
  last: { color: C.faint, fontSize: 11.5, fontWeight: "600", marginTop: 4 },
  resume: { color: C.indigo, fontSize: 13.5, fontWeight: "900", marginTop: 8, textDecorationLine: "underline" },
  stamp: { borderWidth: 2, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, opacity: 0.85 },
  stampText: { fontSize: 10.5, fontWeight: "900", letterSpacing: 1.2 },
});
