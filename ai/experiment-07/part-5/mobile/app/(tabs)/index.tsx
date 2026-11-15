import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GButton, Glass, OS, usePulse } from "../../src/components/os";
import { BrandHeader, Screen, SectionTitle, type IconName } from "../../src/components/ui";
import { RULE, STAGE, useMail, type MailItem, type Stage } from "../../src/mail";
import { F } from "../../src/theme";

// Part 5 demo: my AI agent replies to my emails. Top to bottom, always the same order.
// The flow chart shows what the agent is doing right now; the bar shows how the inbox is going.
const FLOW: { key: string; label: string; icon: IconName; stages: Stage[] }[] = [
  { key: "read", label: "READ", icon: "eye", stages: ["reading"] },
  { key: "write", label: "WRITE", icon: "create", stages: ["writing"] },
  { key: "check", label: "RULE CHECK", icon: "shield-checkmark", stages: ["checking"] },
  { key: "end", label: "SEND / ASK", icon: "git-branch", stages: ["sent", "asking", "not_sent", "no_reply"] },
];
const DONE: Stage[] = ["sent", "no_reply", "not_sent"];

export default function Inbox() {
  const { items, events, running, question, start, error } = useMail();
  const [log, setLog] = useState(false);
  const current = items.find((m) => !DONE.includes(m.stage) && m.stage !== "waiting");
  const finished = items.length > 0 && items.every((m) => DONE.includes(m.stage));
  const started = items.some((m) => m.stage !== "waiting");

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="AI AGENT · HUMAN IN THE LOOP" title="My Mail Agent" subtitle="It reads my emails and writes the replies. For the risky ones, it asks me first." />
        <View style={s.body}>
          <Status current={current} question={!!question} finished={finished} started={started} running={running} />
          <Flow stage={current?.stage} />
          <Progress items={items} />

          {!running && (
            <GButton title={finished ? "Start again" : "Let my agent reply"} icon={finished ? "refresh" : "flash"} onPress={start} />
          )}
          {!!error && <Text style={s.error}>{error}</Text>}

          <SectionTitle right={<Text style={s.count}>{items.length} emails</Text>}>Inbox</SectionTitle>
          <View style={{ gap: 10 }}>
            {items.map((m, i) => <MailCard key={m.id} m={m} n={i + 1} active={current?.id === m.id} />)}
          </View>

          {events.length > 0 && (
            <Pressable onPress={() => setLog((o) => !o)} style={s.logBtn}>
              <Ionicons name="code-slash" size={16} color={OS.soft} />
              <Text style={s.logBtnText}>Behind the scenes</Text>
              <Text style={s.count}>{events.length} steps</Text>
              <Ionicons name={log ? "chevron-up" : "chevron-down"} size={16} color={OS.faint} />
            </Pressable>
          )}
          {log && (
            <Glass hud={false}>
              {events.map((e, i) => (
                <View key={i} style={s.ev}>
                  <Text style={[s.evStep, { color: e.step === "SENT" ? OS.green : e.step === "NOT SENT" ? OS.red : e.step === "CHECK" ? OS.cyan : OS.violetHi }]}>{e.step}</Text>
                  <Text style={s.evText}>{e.emailId ? `${e.emailId.replace("m", "#")} · ` : ""}{e.text}</Text>
                </View>
              ))}
            </Glass>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// the agent itself: a glowing orb and one plain sentence
function Status({ current, question, finished, started, running }: { current?: MailItem; question: boolean; finished: boolean; started: boolean; running: boolean }) {
  const p = usePulse(running && !question);
  const mode = question ? { t: "ASK", c: OS.amber, s: "Waiting for you. Look at the popup." }
    : current ? { t: current.stage === "reading" ? "READ" : current.stage === "writing" ? "WRITE" : "CHECK", c: STAGE[current.stage].color, s: `${STAGE[current.stage].label.toLowerCase().replace(/^./, (x) => x.toUpperCase())}: ${current.name}` }
    : finished ? { t: "DONE", c: OS.green, s: "All 5 emails handled." }
    : { t: started ? "…" : "IDLE", c: OS.faint, s: "Tap the button. The agent starts from the top." };
  return (
    <Glass glow={mode.c} style={s.status}>
      <View style={s.orbWrap}>
        <Animated.View style={[s.ring, { borderColor: mode.c, opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]} />
        <View style={[s.orb, { backgroundColor: mode.c + "33", borderColor: mode.c, shadowColor: mode.c }]}><Text style={[s.orbText, { color: mode.c }]}>{mode.t}</Text></View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.kick}>{question ? "PAUSED · NEEDS YOUR OK" : running ? "YOUR AGENT IS WORKING" : finished ? "INBOX DONE" : "READY"}</Text>
        <Text style={s.statusText}>{mode.s}</Text>
      </View>
    </Glass>
  );
}

// the flow chart: READ → WRITE → RULE CHECK → SEND / ASK, the current step lights up
function Flow({ stage }: { stage?: Stage }) {
  const p = usePulse(!!stage);
  return (
    <Glass hud={false} style={{ paddingVertical: 14 }}>
      <View style={s.flow}>
        <LinearGradient colors={["#8B5CF6", "#22D3EE", "#34D399"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.flowLine} />
        {FLOW.map((f) => {
          const on = !!stage && f.stages.includes(stage);
          const c = f.key === "end" && stage === "asking" ? OS.amber : f.key === "end" ? OS.green : f.key === "check" ? OS.cyan : OS.violetHi;
          return (
            <View key={f.key} style={s.node}>
              {on && <Animated.View style={[s.nodeRing, { borderColor: c, opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]} />}
              <View style={[s.nodeDot, { borderColor: c, backgroundColor: on ? c : "#0B0F1E", shadowColor: c, shadowOpacity: on ? 1 : 0.3 }]}>
                <Ionicons name={f.icon} size={17} color={on ? "#0B0F1E" : c} />
              </View>
              <Text style={[s.nodeLabel, { color: on ? c : OS.soft }]}>{f.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={s.flowNote}>The rule check is our code, not the AI.</Text>
    </Glass>
  );
}

// the chart: one segment per email, coloured by how it ended
function Progress({ items }: { items: MailItem[] }) {
  const n = (st: Stage[]) => items.filter((m) => st.includes(m.stage)).length;
  const stats = [
    { label: "SENT ALONE", v: items.filter((m) => m.answer === "auto").length, c: OS.green },
    { label: "SENT WITH YOUR OK", v: items.filter((m) => m.answer === "approved").length, c: OS.cyan },
    { label: "NOT SENT", v: n(["not_sent"]), c: OS.red },
  ];
  return (
    <View>
      <View style={s.bar}>
        {items.map((m) => <View key={m.id} style={[s.seg, { backgroundColor: m.stage === "waiting" ? "rgba(255,255,255,0.08)" : STAGE[m.stage].color }]} />)}
      </View>
      <View style={s.stats}>
        {stats.map((x) => (
          <View key={x.label} style={s.stat}>
            <Text style={[s.statV, { color: x.c }]}>{x.v}</Text>
            <Text style={s.statL}>{x.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MailCard({ m, n, active }: { m: MailItem; n: number; active: boolean }) {
  const st = STAGE[m.stage];
  return (
    <View style={[s.card, { borderColor: active ? st.color : "rgba(255,255,255,0.08)" }, active && { shadowColor: st.color, shadowOpacity: 0.6, shadowRadius: 12 }]}>
      <View style={s.cardTop}>
        <View style={[s.avatar, { backgroundColor: (m.contact ? OS.violet : OS.pink) + "33" }]}><Text style={s.avatarText}>{m.name[0]}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{n}. {m.name}</Text>
          <Text style={s.subject} numberOfLines={1}>{m.subject}</Text>
        </View>
        <View style={[s.chip, { borderColor: st.color + "88", backgroundColor: st.color + "1A" }]}>
          <Ionicons name={st.icon as IconName} size={11} color={st.color} />
          <Text style={[s.chipText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
      <Text style={s.mailBody} numberOfLines={2}>{m.body}</Text>
      {m.hits.length > 0 && (
        <View style={s.hits}>
          {m.hits.map((h) => { const r = RULE[h as keyof typeof RULE]; return (
            <View key={h} style={[s.hit, { backgroundColor: r.color + "22", borderColor: r.color + "66" }]}>
              <Ionicons name={r.icon as IconName} size={11} color={r.color} /><Text style={[s.hitText, { color: r.color }]}>{r.label.toUpperCase()}</Text>
            </View>); })}
        </View>
      )}
      {!!m.reply && (m.stage === "sent" || m.stage === "not_sent") && (
        <View style={[s.reply, m.stage === "not_sent" && { opacity: 0.5 }]}>
          <Ionicons name="return-down-forward" size={14} color={m.stage === "sent" ? OS.green : OS.red} />
          <Text style={[s.replyText, m.stage === "not_sent" && { textDecorationLine: "line-through" }]} numberOfLines={3}>{m.reply}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 14 },
  error: { color: OS.red, fontWeight: "700", textAlign: "center" },
  count: { color: OS.soft, fontSize: 11, fontWeight: "800", fontFamily: F.mono },
  status: { flexDirection: "row", alignItems: "center", gap: 14 },
  orbWrap: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 58, height: 58, borderRadius: 29, borderWidth: 2 },
  orb: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: "center", justifyContent: "center", shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  orbText: { fontSize: 11, fontWeight: "900", letterSpacing: 1, fontFamily: F.mono },
  kick: { color: OS.violetHi, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.6, fontFamily: F.mono },
  statusText: { color: OS.text, fontSize: 16, fontWeight: "800", marginTop: 3 },
  flow: { flexDirection: "row", justifyContent: "space-between" },
  flowLine: { position: "absolute", left: "12%", right: "12%", top: 21, height: 2, opacity: 0.6 },
  node: { flex: 1, alignItems: "center" },
  nodeRing: { position: "absolute", width: 42, height: 42, borderRadius: 21, borderWidth: 2 },
  nodeDot: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: "center", justifyContent: "center", shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  nodeLabel: { fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8, fontFamily: F.mono, marginTop: 7, textAlign: "center" },
  flowNote: { color: OS.soft, fontSize: 11.5, fontWeight: "700", textAlign: "center", marginTop: 10 },
  bar: { flexDirection: "row", gap: 4, height: 12 },
  seg: { flex: 1, borderRadius: 6 },
  stats: { flexDirection: "row", marginTop: 10, gap: 8 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  statV: { fontSize: 22, fontWeight: "900" },
  statL: { color: OS.soft, fontSize: 8.5, fontWeight: "900", letterSpacing: 0.8, fontFamily: F.mono, textAlign: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(255,255,255,0.045)" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { color: OS.text, fontSize: 16, fontWeight: "900" },
  name: { color: OS.text, fontSize: 14.5, fontWeight: "900" },
  subject: { color: OS.soft, fontSize: 12.5, fontWeight: "700", marginTop: 1 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  chipText: { fontSize: 8.5, fontWeight: "900", letterSpacing: 0.6, fontFamily: F.mono },
  mailBody: { color: OS.soft, fontSize: 12.5, lineHeight: 17, marginTop: 8 },
  hits: { flexDirection: "row", gap: 6, marginTop: 8 },
  hit: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  hitText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, fontFamily: F.mono },
  reply: { flexDirection: "row", gap: 8, marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: "rgba(52,211,153,0.08)" },
  replyText: { flex: 1, color: OS.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  logBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(167,139,250,0.28)", backgroundColor: "rgba(255,255,255,0.045)" },
  logBtnText: { flex: 1, color: OS.soft, fontSize: 13.5, fontWeight: "800" },
  ev: { flexDirection: "row", gap: 10, paddingVertical: 5 },
  evStep: { width: 74, fontSize: 10, fontWeight: "900", fontFamily: F.mono, letterSpacing: 0.6 },
  evText: { flex: 1, color: OS.text, fontSize: 12.5, lineHeight: 17 },
});
