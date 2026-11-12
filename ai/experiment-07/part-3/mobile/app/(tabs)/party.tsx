import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { KIND_COLOR, KIND_ICON, rupees } from "../../src/components/PlanView";
import { BrandHeader, Button, Card, Screen } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { C, F } from "../../src/theme";
import type { PartyItem } from "../../src/types";

function parts(d: string) {
  const date = new Date(`${d}T12:00:00`);
  return { weekday: date.toLocaleDateString("en-IN", { weekday: "long" }), day: date.getDate(), month: date.toLocaleDateString("en-IN", { month: "short" }) };
}

// The party, the way a person reads it: the day, the money, and every order with its shop and price.
export default function Party() {
  const router = useRouter();
  const { party, loadParty } = useMission();
  useFocusEffect(useCallback(() => { loadParty(); }, [loadParty]));

  const items = party?.items ?? [];
  const ordered = items.filter((i) => i.order).length;
  const left = (party?.budget ?? 0) - (party?.spent ?? 0);
  const pct = party?.budget ? Math.min(100, ((party.spent ?? 0) / party.budget) * 100) : 0;
  const d = party?.day ? parts(party.day) : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <BrandHeader title="Party" subtitle="Everything your agent ordered, within your budget" />
        <View style={s.body}>
          {items.length === 0 ? (
            <Card style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="gift-outline" size={30} color={C.orange} /></View>
              <Text style={s.emptyTitle}>Nothing ordered yet</Text>
              <Text style={s.emptyText}>Make a plan, accept it and let the agent run it. Every order lands here, with its shop and price.</Text>
              <View style={{ alignSelf: "stretch", marginTop: 20 }}><Button title="Make a plan" onPress={() => router.push("/")} /></View>
            </Card>
          ) : (
            <>
              {/* the day and the money */}
              <Card>
                {d && (
                  <View style={s.dateRow}>
                    <Text style={s.bigDay}>{d.day}</Text>
                    <View>
                      <Text style={s.weekday}>{d.weekday}</Text>
                      <View style={s.pill}><Text style={s.pillText}>PARTY DAY · {d.month.toUpperCase()}</Text></View>
                    </View>
                  </View>
                )}
                <View style={s.moneyRow}>
                  <View>
                    <Text style={s.moneyLabel}>Spent</Text>
                    <Text style={s.money}>{rupees(party?.spent ?? 0)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.moneyLabel}>Left of {rupees(party?.budget ?? 0)}</Text>
                    <Text style={[s.money, { color: left >= 0 ? C.green : C.red }]}>{rupees(left)}</Text>
                  </View>
                </View>
                <View style={s.track}><View style={[s.fill, { width: `${pct}%`, backgroundColor: left >= 0 ? C.orange : C.red }]} /></View>
                <Text style={s.count}>{ordered} of {items.length} ordered · {items.filter((i) => i.verified).length} checked</Text>
              </Card>

              {/* every order */}
              <View style={s.list}>
                {items.map((i, k) => <Row key={i.id} item={i} last={k === items.length - 1} />)}
              </View>
            </>
          )}
          <Text style={s.footer}>Built on Harihar Code Studio</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ item, last }: { item: PartyItem; last: boolean }) {
  const o = item.order;
  const k = KIND_COLOR[item.kind] ?? KIND_COLOR.other;
  return (
    <View style={[s.row, !last && s.rowLine, !o && s.waiting]}>
      <View style={[s.icon, o ? { backgroundColor: k.color } : { backgroundColor: C.paperDeep }]}>
        <Ionicons name={KIND_ICON[item.kind] ?? "bag-handle-outline"} size={19} color={o ? "#fff" : C.faint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, !o && { color: C.inkSoft }]} numberOfLines={1}>{item.title}</Text>
        {o ? (
          <>
            <Text style={s.shop} numberOfLines={1}>{o.shop} · {o.item}</Text>
            <Text style={s.meta}>
              {item.verified ? <Text style={{ color: C.green, fontWeight: "800" }}>✓ checked</Text> : null}
              {`  ·  arrives by ${o.eta}  ·  order ${o.id}`}
            </Text>
          </>
        ) : (
          <Text style={s.wait}>Waiting for an order · about {rupees(item.cost)}</Text>
        )}
      </View>
      {o && <Text style={[s.price, { color: k.color }]}>{rupees(o.price)}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 14 },
  empty: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.orangeSoft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: C.ink, fontFamily: F.serif, fontSize: 22, fontWeight: "700", marginTop: 14 },
  emptyText: { color: C.muted, fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  bigDay: { color: C.ink, fontFamily: F.serif, fontSize: 54, fontWeight: "700", lineHeight: 58 },
  weekday: { color: C.ink, fontFamily: F.serif, fontSize: 22, fontWeight: "700" },
  pill: { alignSelf: "flex-start", marginTop: 4, backgroundColor: C.orange, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { color: "#fff", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  moneyLabel: { color: C.muted, fontSize: 12, fontWeight: "700" },
  money: { color: C.ink, fontFamily: F.serif, fontSize: 28, fontWeight: "700", marginTop: 2 },
  track: { height: 10, borderRadius: 5, backgroundColor: C.paperDeep, overflow: "hidden", marginTop: 12 },
  fill: { height: 10, borderRadius: 5 },
  count: { color: C.muted, fontSize: 12.5, fontWeight: "700", marginTop: 10 },

  list: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, shadowColor: "#3A2A14", shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  waiting: { opacity: 0.85 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  title: { color: C.ink, fontSize: 15, fontWeight: "800" },
  shop: { color: C.inkSoft, fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  wait: { color: C.faint, fontSize: 12.5, fontWeight: "700", marginTop: 2, fontStyle: "italic" },
  meta: { color: C.muted, fontSize: 12, fontWeight: "600", marginTop: 4, fontStyle: "italic" },
  chip: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "800" },
  price: { color: C.ink, fontFamily: F.serif, fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  footer: { color: C.faint, fontSize: 11.5, fontWeight: "700", textAlign: "center", marginTop: 10, letterSpacing: 0.4 },
});
