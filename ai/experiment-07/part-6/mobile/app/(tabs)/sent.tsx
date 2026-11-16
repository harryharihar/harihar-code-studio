import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Glass, OS } from "../../src/components/os";
import { BrandHeader, Screen, SectionTitle, type IconName } from "../../src/components/ui";
import { STAGE, WHO, useMail } from "../../src/mail";
import { F } from "../../src/theme";

// Part 6: the Manager's end-of-day report. Counts first, then one line per email.
export default function ReportScreen() {
  const { items, report, running } = useMail();
  const stats = report ? [
    { v: report.sentAlone, l: "SENT BY THE TEAM", c: OS.green },
    { v: report.sentWithOk, l: "SENT AFTER YOUR OK", c: OS.cyan },
    { v: report.blocked, l: "SCAM BLOCKED", c: OS.red },
    { v: report.noReply, l: "NO REPLY NEEDED", c: "#94A3B8" },
    { v: report.caught, l: "MISTAKES CAUGHT", c: WHO.checker.color },
    { v: report.notSent, l: "NOT SENT", c: OS.red },
  ] : [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="FROM THE MANAGER" title="Today's Report" subtitle="What my team did, and what I should know." />
        <View style={s.body}>
          {!report ? (
            <Glass hud={false}>
              <Text style={s.empty}>{running ? "The team is still working. The Manager writes this report at the end." : "No report yet. Give the inbox to your team on the Team tab."}</Text>
            </Glass>
          ) : (
            <>
              <Glass glow={WHO.manager.color} style={{ gap: 10 }}>
                <View style={s.memoHead}>
                  <View style={[s.av, { borderColor: WHO.manager.color }]}><Ionicons name="briefcase" size={16} color={WHO.manager.color} /></View>
                  <View>
                    <Text style={s.memoFrom}>MANAGER → YOU</Text>
                    <Text style={s.memoSub}>End of the day</Text>
                  </View>
                </View>
                <Text style={s.summary}>{report.summary}</Text>
              </Glass>

              <View style={s.grid}>
                {stats.map((x) => (
                  <View key={x.l} style={s.stat}>
                    <Text style={[s.statV, { color: x.c }]}>{x.v}</Text>
                    <Text style={s.statL}>{x.l}</Text>
                  </View>
                ))}
              </View>

              <SectionTitle>Every email</SectionTitle>
              <View style={{ gap: 8 }}>
                {items.map((m) => {
                  const st = STAGE[m.stage];
                  const by = m.answer === "auto" ? "Sent by the team alone" : m.answer === "approved" ? "Sent after your OK" : m.answer === "blocked" ? "Blocked by the team" : m.answer === "declined" ? "You said no" : m.answer === "expired" ? "No answer in time" : m.stage === "no_reply" ? "Nobody needed to write" : "";
                  return (
                    <View key={m.id} style={s.row}>
                      <Ionicons name={st.icon as IconName} size={18} color={st.color} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowName}>{m.name} <Text style={s.rowLabel}>· {m.label.toUpperCase()}</Text></Text>
                        <Text style={[s.rowBy, { color: st.color }]}>{by}</Text>
                        {!!m.caught && <Text style={s.caught}>Checker caught: {m.caught}</Text>}
                        {!!m.reply && m.stage === "sent" && <Text style={s.reply} numberOfLines={3}>“{m.reply}”</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 14 },
  empty: { color: OS.soft, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center", paddingVertical: 10 },
  memoHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  av: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  memoFrom: { color: WHO.manager.color, fontSize: 11, fontWeight: "900", letterSpacing: 1.4, fontFamily: F.mono },
  memoSub: { color: OS.soft, fontSize: 12, fontWeight: "700" },
  summary: { color: OS.text, fontSize: 16, lineHeight: 23, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { width: "31.8%", alignItems: "center", paddingVertical: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  statV: { fontSize: 26, fontWeight: "900" },
  statL: { color: OS.soft, fontSize: 8.5, fontWeight: "900", letterSpacing: 0.7, fontFamily: F.mono, textAlign: "center", marginTop: 2 },
  row: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" },
  rowName: { color: OS.text, fontSize: 14, fontWeight: "900" },
  rowLabel: { color: OS.soft, fontSize: 11, fontFamily: F.mono },
  rowBy: { fontSize: 12.5, fontWeight: "800", marginTop: 2 },
  caught: { color: "#FB923C", fontSize: 12, fontWeight: "700", marginTop: 4, lineHeight: 16 },
  reply: { color: OS.soft, fontSize: 12.5, lineHeight: 17, marginTop: 6, fontStyle: "italic" },
});
