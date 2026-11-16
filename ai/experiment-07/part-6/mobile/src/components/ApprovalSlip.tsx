import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMission } from "../store";
import { C, F } from "../theme";
import type { Approval } from "../types";
import { KIND_COLOR } from "./PlanView";

// Part 5: the agent's question to you, drawn as a paper permission slip.
// Two ink stamps to answer: APPROVE or SAY NO. A note tells the agent why. It expires if you don't answer.
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const INKG = "#34D399";
const INKR = "#F87171";

export function ApprovalSlip({ a }: { a: Approval }) {
  const { decide, clockSkew } = useMission();
  const [note, setNote] = useState("");
  const [similar, setSimilar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((new Date(a.expiresAt).getTime() - (Date.now() + clockSkew)) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [a.expiresAt, clockSkew]);
  const answer = async (d: "approve" | "reject") => {
    setBusy(true);
    setError(await decide(a, d, note, d === "approve" && similar));
    setBusy(false);
  };
  const kc = KIND_COLOR[a.kind];
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <View style={s.slip}>
      <View style={s.perf}>{Array.from({ length: 18 }).map((_, i) => <View key={i} style={s.hole} />)}</View>
      <View style={s.head}>
        <Text style={s.kicker}>YOUR AGENT ASKS</Text>
        <Text style={[s.timer, left < 30 && { color: INKR }]}>{left > 0 ? `expires in ${mm}` : "expired"}</Text>
      </View>
      <Text style={s.q}>May I order this?</Text>
      <View style={s.line}>
        <View style={[s.dot, { backgroundColor: kc.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.item}>{a.taskTitle}</Text>
          <Text style={s.shop}>{a.shop} · {a.item}</Text>
        </View>
        <Text style={s.price}>{rupees(a.price)}</Text>
      </View>
      <View style={s.rule}>
        <Ionicons name="hand-left" size={14} color="#FBBF24" />
        <Text style={s.ruleText}>{a.reason}</Text>
      </View>
      <TextInput value={note} onChangeText={setNote} placeholder="Tell the agent why (optional)" placeholderTextColor={C.faint} style={s.note} selectionColor={C.orange} />
      <Pressable onPress={() => setSimilar((v) => !v)} style={s.check} hitSlop={6}>
        <View style={[s.box, similar && { backgroundColor: C.green, borderColor: C.green }]}>{similar && <Ionicons name="checkmark" size={13} color="#04130D" />}</View>
        <Text style={s.checkText}>If I approve: also OK similar {kc.label.toLowerCase()} up to {rupees(a.price)} today</Text>
      </Pressable>
      <View style={s.stamps}>
        <Pressable disabled={busy || left === 0} onPress={() => answer("reject")} style={({ pressed }) => [s.stamp, { borderColor: INKR, transform: [{ rotate: "-3deg" }] }, pressed && { opacity: 0.6 }]}>
          <Text style={[s.stampText, { color: INKR }]}>SAY NO</Text>
        </Pressable>
        <Pressable disabled={busy || left === 0} onPress={() => answer("approve")} style={({ pressed }) => [s.stamp, { borderColor: INKG, backgroundColor: "rgba(52,211,153,0.12)", transform: [{ rotate: "2deg" }] }, pressed && { opacity: 0.6 }]}>
          <Text style={[s.stampText, { color: INKG }]}>APPROVE</Text>
        </Pressable>
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      <Text style={s.foot}>No answer in time? The agent skips it. It never orders this without you.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  slip: { backgroundColor: "#141A2E", borderWidth: 1.5, borderColor: "#FBBF24", paddingHorizontal: 18, paddingTop: 22, paddingBottom: 16, borderRadius: 4, shadowColor: "#FBBF24", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  perf: { position: "absolute", top: 7, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between" },
  hole: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.paper },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: "#FBBF24", fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  timer: { color: C.muted, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
  q: { color: C.ink, fontFamily: F.serif, fontStyle: "italic", fontSize: 26, fontWeight: "700", marginTop: 6 },
  line: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, borderStyle: "dashed" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  item: { color: C.ink, fontSize: 15.5, fontWeight: "800" },
  shop: { color: C.muted, fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  price: { color: C.ink, fontFamily: F.serif, fontSize: 24, fontWeight: "700" },
  rule: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  ruleText: { flex: 1, color: "#FBBF24", fontSize: 13, fontWeight: "700" },
  note: { marginTop: 12, fontSize: 15, color: C.ink, fontFamily: F.serif, fontStyle: "italic", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 8 },
  check: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  box: { width: 18, height: 18, borderWidth: 2, borderColor: C.ink, alignItems: "center", justifyContent: "center" },
  checkText: { flex: 1, color: C.inkSoft, fontSize: 12.5, fontWeight: "600" },
  stamps: { flexDirection: "row", gap: 14, marginTop: 16 },
  stamp: { flex: 1, height: 52, borderWidth: 3, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  stampText: { fontSize: 17, fontWeight: "900", letterSpacing: 2 },
  error: { color: INKR, fontWeight: "700", fontSize: 13, marginTop: 10 },
  foot: { color: C.faint, fontSize: 11.5, fontWeight: "600", marginTop: 12, textAlign: "center" },
});
