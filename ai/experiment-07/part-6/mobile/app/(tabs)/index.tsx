import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GButton, Glass, OS, usePulse } from "../../src/components/os";
import { BrandHeader, Screen, SectionTitle, type IconName } from "../../src/components/ui";
import { STAGE, WHO, useMail, type Agent, type MailItem, type Msg, type Stage } from "../../src/mail";
import { F } from "../../src/theme";

// Part 6 demo: a TEAM of four AI agents replies to my emails.
// The team room shows who is working and who is talking to whom; the chat shows every handoff.
const DONE: Stage[] = ["sent", "no_reply", "not_sent", "blocked"];

export default function Team() {
  const { items, msgs, agents, running, question, report, start, error } = useMail();
  const [all, setAll] = useState(false);
  const last = msgs[msgs.length - 1];
  const finished = !!report && !running;
  const talk = running && last ? [last.from, last.to] : [];
  const shown = all ? msgs : msgs.slice(-6);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="AI AGENTS · TEAMWORK" title="My Mail Team" subtitle="Four AI agents share the work. The risky replies still come to me." />
        <View style={s.body}>
          <Room agents={agents} talk={talk} waiting={!!question} />
          {running && last && <Now m={last} />}
          {!running && (
            <GButton title={finished ? "Start again" : "Give the inbox to my team"} icon={finished ? "refresh" : "people"} onPress={start} />
          )}
          {finished && <Text style={s.hint}>Done. Open the Report tab for the Manager's report.</Text>}
          {!!error && <Text style={s.error}>{error}</Text>}

          <SectionTitle right={<Text style={s.count}>{items.filter((m) => DONE.includes(m.stage)).length}/{items.length} done</Text>}>Inbox</SectionTitle>
          <View style={{ gap: 8 }}>{items.map((m, i) => <Row key={m.id} m={m} n={i + 1} />)}</View>

          {msgs.length > 0 && (
            <>
              <SectionTitle right={<Text style={s.count}>{msgs.length} messages</Text>}>Team chat</SectionTitle>
              <Glass hud={false} style={{ gap: 10 }}>
                {shown.map((m, i) => <Bubble key={msgs.length - shown.length + i} m={m} />)}
              </Glass>
              {msgs.length > 6 && (
                <Pressable onPress={() => setAll((o) => !o)} style={s.more}>
                  <Text style={s.moreText}>{all ? "Show only the latest" : `Show all ${msgs.length} messages`}</Text>
                  <Ionicons name={all ? "chevron-up" : "chevron-down"} size={15} color={OS.soft} />
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// The team room: the Manager on top, the three specialists below. Whoever is busy glows.
function Room({ agents, talk, waiting }: { agents: Record<Agent, { state: string; doing: string }>; talk: string[]; waiting: boolean }) {
  return (
    <Glass style={{ gap: 12 }}>
      <Desk a="manager" st={agents.manager} talking={talk.includes("manager")} wide />
      <View style={s.wires}>
        {(["sorter", "writer", "checker"] as Agent[]).map((a) => (
          <View key={a} style={[s.wire, { backgroundColor: talk.includes("manager") && talk.includes(a) ? WHO[a].color : "rgba(255,255,255,0.12)" }]} />
        ))}
      </View>
      <View style={s.trio}>
        {(["sorter", "writer", "checker"] as Agent[]).map((a) => <Desk key={a} a={a} st={agents[a]} talking={talk.includes(a)} />)}
      </View>
      {talk.includes("writer") && talk.includes("checker") && <Text style={[s.pass, { color: WHO.checker.color }]}>WRITER ⇄ CHECKER</Text>}
      {waiting && <Text style={[s.pass, { color: OS.amber }]}>THE TEAM IS WAITING FOR YOU · LOOK AT THE POPUP</Text>}
    </Glass>
  );
}

function Desk({ a, st, talking, wide }: { a: Agent; st: { state: string; doing: string }; talking: boolean; wide?: boolean }) {
  const w = WHO[a];
  const on = st.state !== "idle" || talking;
  const p = usePulse(on);
  const c = st.state === "waiting" ? OS.amber : w.color;
  return (
    <View style={[s.desk, wide && s.deskWide, { borderColor: on ? c : "rgba(255,255,255,0.08)", backgroundColor: on ? c + "14" : "rgba(255,255,255,0.03)" }, on && { shadowColor: c, shadowOpacity: 0.7, shadowRadius: 14 }]}>
      <View style={s.iconWrap}>
        {on && <Animated.View style={[s.iconRing, { borderColor: c, opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]} />}
        <View style={[s.icon, { borderColor: c, backgroundColor: on ? c : "#0B0F1E" }]}>
          <Ionicons name={w.icon as IconName} size={wide ? 20 : 17} color={on ? "#0B0F1E" : c} />
        </View>
      </View>
      <View style={wide ? { flex: 1 } : { alignItems: "center" }}>
        <Text style={[s.deskName, { color: on ? c : OS.text }, !wide && { textAlign: "center" }]}>{w.name.toUpperCase()}</Text>
        <Text style={[s.deskJob, !wide && { textAlign: "center" }]} numberOfLines={2}>{st.doing || w.job}</Text>
      </View>
    </View>
  );
}

// The latest handoff, big: who said what to whom.
function Now({ m }: { m: Msg }) {
  const f = WHO[m.from], t = WHO[m.to];
  const c = m.kind === "problem" ? OS.red : m.kind === "ask" ? OS.amber : f.color;
  return (
    <View style={[s.now, { borderColor: c + "88" }]}>
      <View style={s.nowHead}>
        <Text style={[s.nowWho, { color: f.color }]}>{f.name.toUpperCase()}</Text>
        {m.from !== m.to && <><Ionicons name="arrow-forward" size={14} color={OS.soft} /><Text style={[s.nowWho, { color: t.color }]}>{t.name.toUpperCase()}</Text></>}
      </View>
      <Text style={s.nowText} numberOfLines={4}>{m.text}</Text>
    </View>
  );
}

function Bubble({ m }: { m: Msg }) {
  const f = WHO[m.from], t = WHO[m.to];
  const tone = m.kind === "problem" ? OS.red : m.kind === "ok" ? OS.green : m.kind === "ask" ? OS.amber : null;
  return (
    <View style={s.bubbleRow}>
      <View style={[s.dot, { backgroundColor: f.color + "33", borderColor: f.color }]}><Ionicons name={f.icon as IconName} size={12} color={f.color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.bubbleHead}>
          <Text style={{ color: f.color }}>{f.name}</Text>
          {m.from !== m.to && <Text style={{ color: OS.faint }}>{"  →  "}<Text style={{ color: t.color }}>{t.name}</Text></Text>}
        </Text>
        <Text style={[s.bubbleText, tone && { color: tone }]}>{m.text}</Text>
      </View>
    </View>
  );
}

function Row({ m, n }: { m: MailItem; n: number }) {
  const st = STAGE[m.stage];
  const active = !DONE.includes(m.stage) && m.stage !== "waiting";
  return (
    <View style={[s.row, { borderColor: active ? st.color : "rgba(255,255,255,0.08)" }]}>
      <Text style={s.rowN}>{n}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.rowName} numberOfLines={1}>{m.name}</Text>
        <Text style={s.rowSub} numberOfLines={1}>{m.label ? `${m.label.toUpperCase()} · ` : ""}{m.subject}</Text>
        {!!m.caught && <Text style={s.caught} numberOfLines={2}>Checker caught: {m.caught}</Text>}
      </View>
      <View style={[s.chip, { borderColor: st.color + "88", backgroundColor: st.color + "1A" }]}>
        <Ionicons name={st.icon as IconName} size={11} color={st.color} />
        <Text style={[s.chipText, { color: st.color }]}>{st.label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 14 },
  error: { color: OS.red, fontWeight: "700", textAlign: "center" },
  hint: { color: OS.green, fontWeight: "800", textAlign: "center", fontSize: 13 },
  count: { color: OS.soft, fontSize: 11, fontWeight: "800", fontFamily: F.mono },
  wires: { flexDirection: "row", justifyContent: "space-around", height: 14, marginVertical: -6 },
  wire: { width: 2, height: 14, borderRadius: 1 },
  trio: { flexDirection: "row", gap: 8 },
  desk: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 10, alignItems: "center", gap: 6, shadowOffset: { width: 0, height: 0 } },
  deskWide: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  iconWrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  iconRing: { position: "absolute", width: 38, height: 38, borderRadius: 19, borderWidth: 2 },
  icon: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  deskName: { fontSize: 11.5, fontWeight: "900", letterSpacing: 1.2, fontFamily: F.mono },
  deskJob: { color: OS.soft, fontSize: 11.5, fontWeight: "700", marginTop: 2, lineHeight: 15 },
  pass: { textAlign: "center", fontSize: 10.5, fontWeight: "900", letterSpacing: 1.2, fontFamily: F.mono },
  now: { borderWidth: 1, borderRadius: 16, padding: 14, backgroundColor: "rgba(255,255,255,0.05)" },
  nowHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  nowWho: { fontSize: 12, fontWeight: "900", letterSpacing: 1.2, fontFamily: F.mono },
  nowText: { color: OS.text, fontSize: 15.5, lineHeight: 21, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 10, backgroundColor: "rgba(255,255,255,0.04)" },
  rowN: { color: OS.soft, fontSize: 13, fontWeight: "900", fontFamily: F.mono, width: 14 },
  rowName: { color: OS.text, fontSize: 14, fontWeight: "900" },
  rowSub: { color: OS.soft, fontSize: 12, fontWeight: "700", marginTop: 1 },
  caught: { color: "#FB923C", fontSize: 11.5, fontWeight: "700", marginTop: 4, lineHeight: 15 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6, fontFamily: F.mono },
  bubbleRow: { flexDirection: "row", gap: 10 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 1 },
  bubbleHead: { fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8, fontFamily: F.mono },
  bubbleText: { color: OS.text, fontSize: 13, lineHeight: 18, marginTop: 2 },
  more: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  moreText: { color: OS.soft, fontSize: 12.5, fontWeight: "800" },
});
