import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinear } from "react-native-svg";
import { GButton, Glass, IconTile, OS } from "../../src/components/os";
import { KIND_COLOR, KIND_ICON, rupees } from "../../src/components/PlanView";
import { BrandHeader, Screen, SectionTitle } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { F } from "../../src/theme";
import type { PartyItem } from "../../src/types";

// Everything the agent bought: a spend ring against the budget, then every order with its shop, price and check.
export default function Orders() {
  const router = useRouter();
  const { party, loadParty } = useMission();
  useFocusEffect(useCallback(() => { loadParty(); }, [loadParty]));

  const items = party?.items ?? [];
  const ordered = items.filter((i) => i.order).length;
  const skipped = items.filter((i) => i.skipped).length;
  const waiting = items.length - ordered - skipped;
  const spent = party?.spent ?? 0;
  const budget = party?.budget ?? 0;
  const left = budget - spent;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="WHAT THE AGENT BOUGHT" title="Orders" subtitle="Every order, inside your budget and your rules." />
        <View style={s.body}>
          {items.length === 0 ? (
            <Glass style={s.empty}>
              <IconTile icon="receipt-outline" color={OS.violet} size={64} />
              <Text style={s.emptyTitle}>No orders yet</Text>
              <Text style={s.emptyText}>Launch a mission, accept the plan and let the agent shop. Every order lands here with its shop and price.</Text>
              <View style={{ alignSelf: "stretch", marginTop: 20 }}><GButton title="Launch a mission" icon="rocket" onPress={() => router.push("/")} /></View>
            </Glass>
          ) : (
            <>
              <Glass glow={left >= 0 ? OS.violet : OS.red} style={s.hero}>
                <Ring spent={spent} budget={budget} />
                <View style={{ flex: 1, gap: 10 }}>
                  <Stat label="SPENT" value={rupees(spent)} color={OS.text} />
                  <Stat label={`LEFT OF ${rupees(budget)}`} value={rupees(left)} color={left >= 0 ? OS.green : OS.red} />
                  <View style={s.legend}>
                    <Dot c={OS.green} t={`${ordered} bought`} />
                    {skipped > 0 && <Dot c={OS.faint} t={`${skipped} skipped`} />}
                    {waiting > 0 && <Dot c={OS.amber} t={`${waiting} left`} />}
                  </View>
                </View>
              </Glass>

              <SectionTitle right={<Text style={s.count}>{items.filter((i) => i.verified).length} verified</Text>}>Receipts</SectionTitle>
              <View style={{ gap: 10 }}>
                {items.map((i) => <Row key={i.id} item={i} />)}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Ring({ spent, budget }: { spent: number; budget: number }) {
  const size = 132, sw = 14, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const f = budget ? Math.min(1, spent / budget) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinear id="r" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#8B5CF6" /><Stop offset="0.5" stopColor="#EC4899" /><Stop offset="1" stopColor="#22D3EE" /></SvgLinear>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={sw} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#r)" strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={s.ringPct}>{Math.round(f * 100)}%</Text>
      <Text style={s.ringLabel}>OF BUDGET</Text>
    </View>
  );
}

const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={[s.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);
const Dot = ({ c, t }: { c: string; t: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c }} />
    <Text style={s.legendText}>{t}</Text>
  </View>
);

function Row({ item }: { item: PartyItem }) {
  const o = item.order;
  const k = KIND_COLOR[item.kind] ?? KIND_COLOR.other;
  return (
    <View style={[s.row, o ? { borderColor: k.color + "40" } : null, item.skipped && { opacity: 0.6 }]}>
      <IconTile icon={KIND_ICON[item.kind] ?? "bag-handle-outline"} color={k.color} dim={!o} />
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{item.title}</Text>
        {o ? (
          <>
            <Text style={s.shop} numberOfLines={1}>{o.shop} · {o.item}</Text>
            <View style={s.metaRow}>
              {item.verified && <View style={s.ok}><Ionicons name="checkmark" size={10} color="#04130D" /><Text style={s.okText}>VERIFIED</Text></View>}
              <Text style={s.meta} numberOfLines={1}>{o.id} · by {o.eta}</Text>
            </View>
          </>
        ) : (
          <Text style={[s.wait, { color: item.skipped ? OS.faint : OS.amber }]}>{item.skipped ? "Skipped · nobody said yes, so it was not bought" : `Not bought yet · about ${rupees(item.cost)}`}</Text>
        )}
      </View>
      {o && <Text style={[s.price, { color: k.color }]}>{rupees(o.price)}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 16 },
  empty: { alignItems: "center", paddingVertical: 32 },
  emptyTitle: { color: OS.text, fontSize: 22, fontWeight: "900", marginTop: 16 },
  emptyText: { color: OS.soft, fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },
  hero: { flexDirection: "row", alignItems: "center", gap: 18 },
  ringPct: { color: OS.text, fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  ringLabel: { color: OS.soft, fontSize: 9, fontWeight: "900", letterSpacing: 1.4, fontFamily: F.mono },
  statLabel: { color: OS.soft, fontSize: 10, fontWeight: "900", letterSpacing: 1.4, fontFamily: F.mono },
  statValue: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5, marginTop: 1 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendText: { color: OS.soft, fontSize: 11.5, fontWeight: "700" },
  count: { color: OS.green, fontSize: 11, fontWeight: "900", fontFamily: F.mono },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" },
  title: { color: OS.text, fontSize: 15, fontWeight: "800" },
  shop: { color: OS.soft, fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  ok: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: OS.green, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  okText: { color: "#04130D", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  meta: { flex: 1, color: OS.faint, fontSize: 11, fontWeight: "700", fontFamily: F.mono },
  wait: { fontSize: 12.5, fontWeight: "700", marginTop: 2 },
  price: { fontSize: 16, fontWeight: "900", fontFamily: F.mono },
});
