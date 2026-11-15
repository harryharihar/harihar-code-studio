import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Glass, OS } from "../../src/components/os";
import { BrandHeader, Screen, SectionTitle, type IconName } from "../../src/components/ui";
import { STAGE, useMail, type MailItem } from "../../src/mail";
import { F } from "../../src/theme";

// Part 5: what happened to every email: a donut chart, then every decision and every reply.
const WHO: Record<string, { t: string; c: string; icon: IconName }> = {
  auto: { t: "Sent by the agent alone", c: OS.green, icon: "flash" },
  approved: { t: "Sent after your OK", c: OS.cyan, icon: "thumbs-up" },
  declined: { t: "You said no", c: OS.red, icon: "close-circle" },
  expired: { t: "No answer in time", c: OS.faint, icon: "hourglass" },
};

export default function Sent() {
  const { items } = useMail();
  const parts = [
    { k: "auto", v: items.filter((m) => m.answer === "auto").length, c: OS.green, l: "Alone" },
    { k: "approved", v: items.filter((m) => m.answer === "approved").length, c: OS.cyan, l: "Your OK" },
    { k: "no", v: items.filter((m) => m.stage === "not_sent").length, c: OS.red, l: "Not sent" },
    { k: "none", v: items.filter((m) => m.stage === "no_reply").length, c: "#94A3B8", l: "No reply" },
  ];
  const done = items.filter((m) => m.stage !== "waiting" && !["reading", "writing", "checking", "asking"].includes(m.stage));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="DECISION LOG" title="Sent" subtitle="Who decided what: the agent, or you." />
        <View style={s.body}>
          <Glass glow={OS.violet} style={s.hero}>
            <Donut parts={parts} total={items.length || 5} />
            <View style={{ flex: 1, gap: 8 }}>
              {parts.map((p) => (
                <View key={p.k} style={s.leg}>
                  <View style={[s.legDot, { backgroundColor: p.c }]} />
                  <Text style={s.legText}>{p.l}</Text>
                  <Text style={[s.legV, { color: p.c }]}>{p.v}</Text>
                </View>
              ))}
            </View>
          </Glass>

          <SectionTitle>Every email</SectionTitle>
          {done.length === 0 && <Text style={s.empty}>Nothing yet. Go to Inbox and tap “Let my agent reply”.</Text>}
          {done.map((m) => <Row key={m.id} m={m} />)}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Donut({ parts, total }: { parts: { v: number; c: string }[]; total: number }) {
  const size = 124, sw = 16, r = (size - sw) / 2, C = 2 * Math.PI * r;
  let off = 0;
  const sent = parts[0].v + parts[1].v;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={sw} fill="none" />
        {parts.map((p, i) => {
          const len = (p.v / total) * C; const el = (
            <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={p.c} strokeWidth={sw} fill="none" strokeDasharray={`${Math.max(0, len - 3)} ${C}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          ); off += len; return el;
        })}
      </Svg>
      <Text style={s.big}>{sent}/{total}</Text>
      <Text style={s.bigL}>SENT</Text>
    </View>
  );
}

function Row({ m }: { m: MailItem }) {
  const w = m.stage === "no_reply" ? { t: "No reply needed", c: "#94A3B8", icon: "checkmark-done" as IconName } : WHO[m.answer] ?? WHO.declined;
  return (
    <View style={[s.row, { borderColor: w.c + "44" }]}>
      <View style={s.rowTop}>
        <Ionicons name={w.icon} size={20} color={w.c} />
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{m.name}</Text>
          <Text style={s.subject} numberOfLines={1}>{m.subject}</Text>
        </View>
        <Text style={[s.tag, { color: STAGE[m.stage].color }]}>{STAGE[m.stage].label}</Text>
      </View>
      <Text style={[s.who, { color: w.c }]}>{w.t}</Text>
      {!!m.reply && m.stage !== "no_reply" && <Text style={[s.reply, m.stage === "not_sent" && { textDecorationLine: "line-through", opacity: 0.5 }]} numberOfLines={3}>“{m.reply}”</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 12 },
  hero: { flexDirection: "row", alignItems: "center", gap: 18 },
  big: { color: OS.text, fontSize: 26, fontWeight: "900" },
  bigL: { color: OS.soft, fontSize: 9, fontWeight: "900", letterSpacing: 1.4, fontFamily: F.mono },
  leg: { flexDirection: "row", alignItems: "center", gap: 8 },
  legDot: { width: 10, height: 10, borderRadius: 5 },
  legText: { flex: 1, color: OS.soft, fontSize: 13, fontWeight: "700" },
  legV: { fontSize: 16, fontWeight: "900" },
  empty: { color: OS.soft, fontSize: 13.5, fontWeight: "600" },
  row: { borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(255,255,255,0.045)" },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { color: OS.text, fontSize: 14.5, fontWeight: "900" },
  subject: { color: OS.soft, fontSize: 12, fontWeight: "700" },
  tag: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, fontFamily: F.mono },
  who: { fontSize: 12.5, fontWeight: "900", marginTop: 8 },
  reply: { color: OS.text, fontSize: 13, lineHeight: 18, marginTop: 4, fontStyle: "italic" },
});
