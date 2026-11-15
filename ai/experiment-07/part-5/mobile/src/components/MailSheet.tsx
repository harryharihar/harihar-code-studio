import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { RULE, useMail, type MailItem, type Question } from "../mail";
import { F } from "../theme";
import { OS } from "./os";
import type { IconName } from "./ui";

// Part 5: the agent's question, on top of ANY screen. The email, why it stopped, the reply it wants to send,
// and your three choices: send it, rewrite it with your note, or don't send it.
export function MailSheet({ q, m }: { q: Question; m: MailItem }) {
  const { answer, skew } = useMail();
  const up = useRef(new Animated.Value(0)).current;
  const [note, setNote] = useState("");
  const [left, setLeft] = useState(0);
  const total = Math.max(1, Math.round((new Date(q.expiresAt).getTime() - new Date(q.createdAt).getTime()) / 1000));
  useEffect(() => { Animated.spring(up, { toValue: 1, useNativeDriver: true, friction: 9 }).start(); }, [up]);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((new Date(q.expiresAt).getTime() - (Date.now() + skew)) / 1000)));
    tick(); const t = setInterval(tick, 500); return () => clearInterval(t);
  }, [q.expiresAt, skew]);
  const R = 22, CIRC = 2 * Math.PI * R;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[s.dim, { opacity: up }]} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }] }]}>
        <View style={s.grab} />
        <View style={s.head}>
          <Ionicons name="hand-left" size={18} color={OS.amber} />
          <Text style={s.title}>Your agent needs your OK</Text>
          <View style={{ flex: 1 }} />
          <View style={s.ring}>
            <Svg width={52} height={52}>
              <Circle cx={26} cy={26} r={R} stroke="#1F2840" strokeWidth={4} fill="none" />
              <Circle cx={26} cy={26} r={R} stroke={left < 30 ? OS.red : OS.amber} strokeWidth={4} fill="none" strokeDasharray={`${CIRC}`} strokeDashoffset={CIRC * (1 - left / total)} strokeLinecap="round" rotation={-90} origin="26,26" />
            </Svg>
            <Text style={s.ringText}>{mm}</Text>
          </View>
        </View>

        <View style={s.why}>
          {q.hits.map((h) => { const r = RULE[h as keyof typeof RULE]; return (
            <View key={h} style={[s.hit, { backgroundColor: r.color + "22", borderColor: r.color }]}>
              <Ionicons name={r.icon as IconName} size={13} color={r.color} /><Text style={[s.hitText, { color: r.color }]}>{r.label.toUpperCase()}</Text>
            </View>); })}
          <Text style={s.whyText}>Your rule says: ask me first.</Text>
        </View>

        <View style={s.mail}>
          <Text style={s.from}>{m.name} · {m.subject}</Text>
          <Text style={s.body} numberOfLines={3}>{m.body}</Text>
        </View>
        <Text style={s.label}>THE AGENT WANTS TO REPLY{q.round > 1 ? " (REWRITTEN)" : ""}</Text>
        <View style={s.draft}><Text style={s.draftText}>{q.reply}</Text></View>

        <TextInput value={note} onChangeText={setNote} placeholder="Want a change? e.g. say Monday" placeholderTextColor={OS.faint} style={s.note} />

        <Pressable onPress={() => answer("send")} style={({ pressed }) => [s.send, pressed && { opacity: 0.8 }]}>
          <Ionicons name="paper-plane" size={18} color="#04130D" />
          <Text style={s.sendText}>Send</Text>
        </Pressable>
        <View style={s.row}>
          <Pressable disabled={!note.trim()} onPress={() => answer("rewrite", note)} style={({ pressed }) => [s.alt, { borderColor: OS.violetHi }, !note.trim() && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}>
            <Ionicons name="create" size={16} color={OS.violetHi} /><Text style={[s.altText, { color: OS.violetHi }]}>Rewrite</Text>
          </Pressable>
          <Pressable onPress={() => answer("skip")} style={({ pressed }) => [s.alt, { borderColor: OS.red }, pressed && { opacity: 0.6 }]}>
            <Ionicons name="close" size={16} color={OS.red} /><Text style={[s.altText, { color: OS.red }]}>Don't send</Text>
          </Pressable>
        </View>
        <Text style={s.foot}>No answer before the timer ends? It is not sent.</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  dim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(2,4,10,0.75)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#100C26", borderTopWidth: 2, borderColor: OS.amber, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30 },
  grab: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "#1F2840", marginBottom: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: OS.amber, fontSize: 16, fontWeight: "900" },
  ring: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  ringText: { position: "absolute", color: OS.text, fontSize: 11.5, fontWeight: "900", fontFamily: F.mono },
  why: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6 },
  hit: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  hitText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, fontFamily: F.mono },
  whyText: { color: OS.soft, fontSize: 12.5, fontWeight: "700", marginLeft: 4 },
  mail: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)" },
  from: { color: OS.text, fontSize: 13.5, fontWeight: "900" },
  body: { color: OS.soft, fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  label: { color: OS.violetHi, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.4, fontFamily: F.mono, marginTop: 12 },
  draft: { marginTop: 6, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(167,139,250,0.45)", backgroundColor: "rgba(139,92,246,0.12)" },
  draftText: { color: OS.text, fontSize: 14.5, lineHeight: 20, fontWeight: "700" },
  note: { marginTop: 12, borderRadius: 12, backgroundColor: "#070A13", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: OS.text, fontWeight: "600" },
  send: { marginTop: 12, height: 56, borderRadius: 16, backgroundColor: OS.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  sendFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: OS.green },
  sendText: { color: "#04130D", fontSize: 16.5, fontWeight: "900" },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  alt: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  altText: { fontSize: 15, fontWeight: "900" },
  foot: { color: OS.faint, fontSize: 11.5, fontWeight: "600", textAlign: "center", marginTop: 10 },
});
