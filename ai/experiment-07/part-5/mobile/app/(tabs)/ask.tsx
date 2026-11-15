import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Glass, OS } from "../../src/components/os";
import { BrandHeader, Screen, SectionTitle, type IconName } from "../../src/components/ui";
import { RULE, useMail, type Rules } from "../../src/mail";
import { F } from "../../src/theme";

// Part 5: your rules for the mail agent. Checked by OUR CODE before every reply is sent, never by the AI.
const KEYS = ["money", "meeting", "stranger"] as const;
const STEPS: { icon: IconName; t: string; c: string }[] = [
  { icon: "mail", t: "Email comes in", c: OS.soft },
  { icon: "sparkles", t: "AI writes a reply", c: OS.violetHi },
  { icon: "shield-checkmark", t: "Our code checks your rules", c: OS.cyan },
];

export default function RulesScreen() {
  const { rules, setRules, ttl } = useMail();
  const flip = (k: keyof Rules) => setRules({ ...rules, [k]: !rules[k] });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="HUMAN IN THE LOOP" title="Your Rules" subtitle="Set these first. The agent must ask you before breaking one." />
        <View style={s.body}>
          <SectionTitle>Ask me first when…</SectionTitle>
          {KEYS.map((k) => {
            const r = RULE[k]; const on = rules[k];
            return (
              <View key={k} style={[s.rule, { borderColor: on ? r.color + "88" : "rgba(255,255,255,0.08)" }, on && { shadowColor: r.color, shadowOpacity: 0.35, shadowRadius: 12 }]}>
                <View style={[s.icon, { backgroundColor: on ? r.color + "26" : "rgba(255,255,255,0.05)" }]}><Ionicons name={r.icon as IconName} size={24} color={on ? r.color : OS.faint} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.ruleTitle, { color: on ? r.color : OS.soft }]}>{r.label}</Text>
                  <Text style={s.ruleText}>{r.text}</Text>
                </View>
                <Switch value={on} onValueChange={() => flip(k)} trackColor={{ true: r.color, false: "#1F2840" }} thumbColor="#fff" />
              </View>
            );
          })}

          <SectionTitle>How a reply is sent</SectionTitle>
          <Glass hud={false}>
            {STEPS.map((x, i) => (
              <View key={x.t}>
                <View style={s.step}>
                  <View style={[s.stepDot, { borderColor: x.c }]}><Ionicons name={x.icon} size={16} color={x.c} /></View>
                  <Text style={s.stepText}>{x.t}</Text>
                </View>
                <View style={s.arrow}><Ionicons name="arrow-down" size={16} color={OS.faint} /></View>
              </View>
            ))}
            <View style={s.split}>
              <View style={[s.out, { borderColor: OS.green + "88", backgroundColor: OS.green + "14" }]}>
                <Ionicons name="paper-plane" size={18} color={OS.green} />
                <Text style={[s.outT, { color: OS.green }]}>No rule hit</Text>
                <Text style={s.outS}>Sent on its own</Text>
              </View>
              <View style={[s.out, { borderColor: OS.amber + "88", backgroundColor: OS.amber + "14" }]}>
                <Ionicons name="hand-left" size={18} color={OS.amber} />
                <Text style={[s.outT, { color: OS.amber }]}>A rule hit</Text>
                <Text style={s.outS}>Popup: you decide</Text>
              </View>
            </View>
            <View style={s.expire}>
              <Ionicons name="hourglass" size={15} color={OS.red} />
              <Text style={s.expireText}>No answer in {Math.round(ttl / 60)} min → the reply is not sent.</Text>
            </View>
          </Glass>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 12 },
  rule: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.045)", shadowOffset: { width: 0, height: 0 } },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ruleTitle: { fontSize: 17, fontWeight: "900" },
  ruleText: { color: OS.soft, fontSize: 13, fontWeight: "600", marginTop: 2, lineHeight: 18 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0F1E" },
  stepText: { color: OS.text, fontSize: 15, fontWeight: "800" },
  arrow: { width: 36, alignItems: "center", paddingVertical: 4 },
  split: { flexDirection: "row", gap: 10 },
  out: { flex: 1, alignItems: "center", gap: 4, padding: 12, borderRadius: 14, borderWidth: 1 },
  outT: { fontSize: 14, fontWeight: "900" },
  outS: { color: OS.soft, fontSize: 12, fontWeight: "700" },
  expire: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "center" },
  expireText: { color: OS.soft, fontSize: 12.5, fontWeight: "700" },
});
