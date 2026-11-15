import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { KIND_COLOR, KIND_ICON } from "../../src/components/PlanView";
import { Timeline } from "../../src/components/Timeline";
import { Screen } from "../../src/components/ui";
import { LinearGradient } from "expo-linear-gradient";
import { useMission } from "../../src/store";
import type { Approval, PartyItem, RunEvent } from "../../src/types";

// Part 5: the agent at work, as a LIVE SHOPPING CART.
// For every item it compares three shops (product tiles), picks one, and drops it into the cart while a ₹ ticker
// counts up. Over your limit, the screen dims and a payment authorization sheet slides up: hold to approve, or decline.
// The raw agent loop is still here, folded away under "Behind the scenes".
const logo = require("../../assets/images/hcs-logo.png");
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
// Agent console colours: violet = the agent, cyan = acting, green = done, amber = asks you, red = blocked
const GL = "rgba(255,255,255,0.045)", EDGE = "rgba(167,139,250,0.28)";
const K = { bg: "#070A13", card: "#0E1424", ink: "#EAF0FF", soft: "#9AA6C4", faint: "#56627F", line: "#1F2840", orange: "#8B5CF6", green: "#34D399", red: "#F87171", amber: "#FBBF24", blue: "#22D3EE" };

export default function Live() {
  const router = useRouter();
  const { tasks, loadTasks, exec, execute, pollExec, party, loadParty, goal, approvals, loadAsk, policy, openRun } = useMission();
  const running = exec.status === "running";
  const waiting = exec.status === "waiting";
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState(false);

  useFocusEffect(useCallback(() => { loadTasks(); loadParty(); loadAsk(); }, [loadTasks, loadParty, loadAsk]));
  useEffect(() => {
    if ((!running && !waiting) || !exec.id) return;
    const t = setInterval(pollExec, waiting ? 2000 : 1000);
    return () => clearInterval(t);
  }, [running, waiting, exec.id, pollExec]);
  // Always watch for open questions while Live is on screen, even if this screen lost track of the run
  // (an app reload mid-run). A waiting run is re-attached, so the payment sheet can never be missed.
  useFocusEffect(useCallback(() => {
    const t = setInterval(loadAsk, 2000);
    return () => clearInterval(t);
  }, [loadAsk]));
  const pendingRun = approvals.find((a) => a.status === "pending")?.runId;
  useEffect(() => {
    if (pendingRun && pendingRun !== exec.id && exec.status !== "running") { openRun(pendingRun).then(() => setShown(9999)); }
  }, [pendingRun, exec.id, exec.status, openRun]);
  const events = exec.events;
  useEffect(() => {
    if (shown > events.length) return setShown(events.length);
    if (shown === events.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 380);
    return () => clearTimeout(t);
  }, [events.length, shown]);

  const visible = events.slice(0, shown);
  const live = running || shown < events.length;
  const started = visible.length > 0;
  const items = party?.items ?? [];
  const budget = party?.budget ?? 0;
  const question = !live ? approvals.find((a) => a.status === "pending" && a.runId === exec.id) : undefined;
  const has = (pred: (e: RunEvent) => boolean) => visible.some(pred);

  // what is in the cart, as far as the viewer has seen
  const bought = items.filter((i) => i.order && (started ? has((e) => e.kind === "verify" && e.title === `${i.ref} verified`) : i.verified));
  const skipped = items.filter((i) => i.skipped && (started ? has((e) => e.kind === "approval" && e.title.startsWith("No answer") && e.detail.startsWith(i.ref)) : true));
  const total = bought.reduce((n, i) => n + (i.order?.price ?? 0), 0);

  // the item on the shelf right now: the one being ordered, or asked about, or next up
  const current = useMemo(() => {
    const ref = question?.taskRef
      ?? [...visible].reverse().map((e) => (e.kind === "act" ? /place_order\((\w+)/.exec(e.detail)?.[1] : e.kind === "observe" && e.title === "get_next_task" ? /^Next: (\w+)/.exec(e.detail)?.[1] : undefined)).find(Boolean);
    const it = items.find((i) => i.ref === ref) ?? items.find((i) => !i.order && !i.skipped);
    if (!it) return null;
    const lastAct = [...visible].reverse().find((e) => e.kind === "act" && e.detail.startsWith(`place_order(${it.ref},`));
    const picked = question?.taskRef === it.ref ? question.shop : it.order?.shop ?? (lastAct ? /place_order\(\w+, ([^)]+)\)/.exec(lastAct.detail)?.[1] : undefined);
    return { it, picked };
  }, [question, visible, items]);

  const done = !live && !waiting && exec.status === "done";
  const state = waiting && question ? "ask" : live ? "shop" : done ? "done" : "idle";

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {/* top bar */}
          <View style={s.top}>
            <Image source={logo} style={s.logo} />
            <Text style={s.brand}>Live cart</Text>
            <View style={{ flex: 1 }} />
            <StateChip state={state} />
          </View>

          {tasks.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cart-outline" size={44} color={K.orange} />
              <Text style={s.emptyTitle}>Your cart is empty</Text>
              <Text style={s.emptyText}>Give your agent a goal on Mission and accept the plan. Then watch it shop.</Text>
              <Pressable onPress={() => router.push("/")} style={s.cta}><LinearGradient colors={["#8B5CF6", "#EC4899", "#22D3EE"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /><Text style={s.ctaText}>Give it a goal</Text></Pressable>
            </View>
          ) : (
            <>
              {/* the budget ticker */}
              <View style={s.hero}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <AgentCore mode={state === "ask" ? "ask" : !live ? (done ? "done" : "idle") : visible.at(-1)?.kind === "act" ? "act" : "think"} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.heroKicker}>{state === "ask" ? "PAUSED · WAITING FOR YOU" : state === "shop" ? "YOUR AGENT IS SHOPPING" : state === "done" ? "SHOPPING DONE" : "READY TO SHOP"}</Text>
                    <Text style={s.heroMode}>{state === "ask" ? "I need your OK before I pay." : !live ? (done ? "Everything you allowed is bought." : "Tap Start shopping.") : visible.at(-1)?.kind === "act" ? "Acting: placing an order…" : "Thinking: comparing shops…"}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                  <Ticker value={total} />
                  <Text style={s.heroOf}>of {rupees(budget)}</Text>
                </View>
                <View style={s.bar}><View style={[s.barFill, { width: `${budget ? Math.min(100, (total / budget) * 100) : 0}%` }]} /></View>
                <View style={s.heroRow}>
                  <Text style={s.heroSmall}>{bought.length} of {items.length} in cart{skipped.length ? ` · ${skipped.length} skipped` : ""}</Text>
                  <Text style={s.heroLimit}>✋ asks you above {rupees(policy.maxAuto)}</Text>
                </View>
                {!!goal && <Text style={s.goal} numberOfLines={1}>“{goal}”</Text>}
              </View>

              {/* the shelf: three shops for the current item */}
              {current && !done && <Shelf item={current.it} picked={current.picked} limit={policy.maxAuto} alert={state === "ask"} />}

              {/* the cart */}
              <View style={s.cart}>
                <View style={s.cartHead}>
                  <Ionicons name="cart" size={20} color={K.ink} />
                  <Text style={s.cartTitle}>Cart</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.cartCount}>{bought.length} items</Text>
                </View>
                {bought.length === 0 && skipped.length === 0 && <Text style={s.cartEmpty}>Nothing yet. Items drop in here as the agent buys them.</Text>}
                {bought.map((i) => <CartRow key={i.id} i={i} />)}
                {skipped.map((i) => <CartRow key={i.id} i={i} skipped />)}
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValue}>{rupees(total)}</Text>
                </View>
              </View>

              {/* controls */}
              <Pressable disabled={live || waiting} onPress={() => { setShown(0); execute(items.some((i) => i.order || i.skipped)); }} style={({ pressed }) => [s.cta, { marginHorizontal: 16 }, (live || waiting) && { opacity: 0.45 }, pressed && { opacity: 0.85 }]}>
                <LinearGradient colors={["#8B5CF6", "#EC4899", "#22D3EE"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <Ionicons name={done ? "refresh" : "cart"} size={18} color="#fff" />
                <Text style={s.ctaText}>{live ? "Shopping…" : waiting ? "Waiting for your OK" : items.some((i) => i.order || i.skipped) ? "Shop again from scratch" : "Start shopping"}</Text>
              </Pressable>
              {!!exec.error && <Text style={s.error}>{running ? "Server offline. Waiting for it to come back…" : exec.error}</Text>}

              <Pressable onPress={() => setOpen((o) => !o)} style={s.behind}>
                <Ionicons name="code-slash" size={16} color={K.soft} />
                <Text style={s.behindText}>Behind the scenes</Text>
                <Text style={s.behindSub}>{visible.length} steps</Text>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={K.faint} />
              </Pressable>
              {open && started && <View style={s.tech}><Timeline events={visible} /></View>}
            </>
          )}
        </ScrollView>

        <Toast e={visible.at(-1)} items={items} live={live} />
      </View>
    </Screen>
  );
}

function StateChip({ state }: { state: "ask" | "shop" | "done" | "idle" }) {
  const look = { ask: ["Needs your OK", K.red], shop: ["Shopping", K.orange], done: ["Done", K.green], idle: ["Ready", K.soft] }[state];
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state !== "shop" && state !== "ask") return;
    const l = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true })]));
    l.start();
    return () => l.stop();
  }, [state, pulse]);
  return (
    <View style={[s.chip, { borderColor: look[1] }]}>
      <Animated.View style={[s.chipDot, { backgroundColor: look[1], opacity: state === "shop" || state === "ask" ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }) : 1 }]} />
      <Text style={[s.chipText, { color: look[1] }]}>{look[0]}</Text>
    </View>
  );
}

// the agent's "core": a glowing orb that pulses in the colour of what it is doing right now
const MODE = { think: ["#A78BFA", "THINK"], act: ["#22D3EE", "ACT"], ask: ["#FBBF24", "ASK"], done: ["#34D399", "DONE"], idle: ["#56627F", "IDLE"] } as const;
function AgentCore({ mode }: { mode: keyof typeof MODE }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(p, { toValue: 1, duration: mode === "idle" || mode === "done" ? 2600 : 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    l.start();
    return () => { l.stop(); p.setValue(0); };
  }, [mode, p]);
  const [c, label] = MODE[mode];
  return (
    <View style={{ width: 62, height: 62, alignItems: "center", justifyContent: "center" }}>
      {[0, 0.5].map((d) => (
        <Animated.View key={d} style={{ position: "absolute", width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: c,
          opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.8 - d, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.7 + d * 0.3, 1.35] }) }] }} />
      ))}
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c, alignItems: "center", justifyContent: "center", shadowColor: c, shadowOpacity: 0.9, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }}>
        <Text style={{ color: "#070A13", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }}>{label}</Text>
      </View>
    </View>
  );
}

// the ₹ total counts up like a price ticker
function Ticker({ value }: { value: number }) {
  const a = useRef(new Animated.Value(value)).current;
  const [n, setN] = useState(value);
  useEffect(() => {
    const id = a.addListener(({ value: v }) => setN(Math.round(v)));
    Animated.timing(a, { toValue: value, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => a.removeListener(id);
  }, [value, a]);
  return <Text style={s.ticker}>{rupees(n)}</Text>;
}

// three shops for one item, as product tiles. The one the agent picked wears a ribbon.
function Shelf({ item, picked, limit, alert }: { item: PartyItem; picked?: string; limit: number; alert: boolean }) {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    appear.setValue(0);
    Animated.spring(appear, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  }, [item.ref, appear]);
  const kc = KIND_COLOR[item.kind];
  return (
    <View style={s.shelf}>
      <View style={s.shelfHead}>
        <View style={[s.kindDot, { backgroundColor: kc.soft }]}><Ionicons name={KIND_ICON[item.kind]} size={16} color={kc.color} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.shelfKicker}>COMPARING 3 SHOPS</Text>
          <Text style={s.shelfTitle} numberOfLines={1}>{item.title}</Text>
        </View>
      </View>
      <View style={s.tiles}>
        {(item.choices ?? []).map((c, k) => {
          const on = c.shop === picked; const over = c.price > limit;
          return (
            <Animated.View key={c.shop} style={[s.tile, on && { borderColor: alert ? K.red : K.orange, borderWidth: 2.5 }, { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [24 + k * 10, 0] }) }] }]}>
              {on && <View style={[s.ribbon, { backgroundColor: alert ? K.red : K.orange }]}><Text style={s.ribbonText}>{alert ? "NEEDS OK" : "PICKED"}</Text></View>}
              <View style={[s.tileIcon, { backgroundColor: kc.soft }]}><Ionicons name={KIND_ICON[item.kind]} size={26} color={kc.color} /></View>
              <Text style={s.tileShop} numberOfLines={1}>{c.shop}</Text>
              <Text style={s.tileItem} numberOfLines={2}>{c.item}</Text>
              <Text style={s.tilePrice}>{rupees(c.price)}</Text>
              <Text style={s.tileRating}>★ {c.rating}</Text>
              {over && <Text style={s.tileOver}>over limit</Text>}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function CartRow({ i, skipped }: { i: PartyItem; skipped?: boolean }) {
  const kc = KIND_COLOR[i.kind];
  const drop = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(drop, { toValue: 1, useNativeDriver: true, friction: 6 }).start(); }, [drop]);
  return (
    <Animated.View style={[s.row, { opacity: drop, transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] }]}>
      <View style={[s.rowIcon, { backgroundColor: skipped ? K.bg : kc.soft }]}><Ionicons name={KIND_ICON[i.kind]} size={18} color={skipped ? K.faint : kc.color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, skipped && { color: K.faint, textDecorationLine: "line-through" }]} numberOfLines={1}>{i.title}</Text>
        <Text style={[s.rowSub, skipped && { color: K.red }]} numberOfLines={1}>{skipped ? "Skipped · you didn't answer, so it wasn't bought" : `${i.order?.shop} · ${i.order?.item}`}</Text>
      </View>
      <Text style={[s.rowPrice, skipped && { color: K.faint }]}>{skipped ? "—" : rupees(i.order?.price ?? 0)}</Text>
    </Animated.View>
  );
}

// one line for the newest moment, sliding in at the top
function Toast({ e, items, live }: { e?: RunEvent; items: PartyItem[]; live: boolean }) {
  const y = useRef(new Animated.Value(-120)).current;
  const msg = useMemo(() => {
    if (!e) return null;
    const title = (ref?: string) => items.find((i) => i.ref === ref)?.title ?? "it";
    if (e.kind === "verify" && e.title.endsWith("verified")) { const ref = e.title.split(" ")[0]; const it = items.find((i) => i.ref === ref); return { icon: "checkmark-circle" as const, c: K.green, t: `Added to cart · ${title(ref)}${it?.order ? ` · ${rupees(it.order.price)}` : ""}` }; }
    if (e.kind === "approval") {
      if (e.title === "Waiting for you") return { icon: "hand-left" as const, c: K.red, t: "Over your limit. Waiting for your OK…" };
      if (e.title === "Approved by you") return { icon: "thumbs-up" as const, c: K.green, t: "You approved. Buying it now." };
      if (e.title === "Rejected by you") return { icon: "close-circle" as const, c: K.amber, t: "You declined. Finding a cheaper one…" };
      if (e.title.startsWith("No answer")) return { icon: "timer" as const, c: K.red, t: `No answer. ${title(e.detail.split(" ")[0])} skipped.` };
      return { icon: "ticket" as const, c: K.blue, t: "Allowed by your “yes to similar”." };
    }
    if (e.kind === "act" && e.title === "get_next_task") return { icon: "search" as const, c: K.soft, t: "Comparing shops…" };
    return null;
  }, [e, items]);
  useEffect(() => {
    if (!msg) return;
    y.setValue(-120);
    Animated.sequence([Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 8 }), Animated.delay(live ? 1600 : 2600), Animated.timing(y, { toValue: -120, duration: 250, useNativeDriver: true })]).start();
  }, [msg?.t]);
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.toast, { transform: [{ translateY: y }] }]}>
      <Ionicons name={msg.icon} size={18} color={msg.c} />
      <Text style={s.toastText} numberOfLines={2}>{msg.t}</Text>
    </Animated.View>
  );
}

// the climax: a payment authorization sheet. Hold to approve (like a real payment), or decline with a note.
// Shown by the tabs layout on top of every screen (so it can never be missed).
export function PaySheet({ a, limit }: { a: Approval; limit: number }) {
  const { decide, clockSkew } = useMission();
  const up = useRef(new Animated.Value(0)).current;
  const hold = useRef(new Animated.Value(0)).current;
  const [note, setNote] = useState("");
  const [similar, setSimilar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const total = useRef(Math.max(1, Math.round((new Date(a.expiresAt).getTime() - new Date(a.createdAt).getTime()) / 1000))).current;
  useEffect(() => { Animated.spring(up, { toValue: 1, useNativeDriver: true, friction: 9 }).start(); }, [up]);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((new Date(a.expiresAt).getTime() - (Date.now() + clockSkew)) / 1000)));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [a.expiresAt, clockSkew]);
  const answer = async (d: "approve" | "reject") => { setBusy(true); await decide(a, d, note, d === "approve" && similar); setBusy(false); };
  const startHold = () => Animated.timing(hold, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => finished && answer("approve"));
  const stopHold = () => { hold.stopAnimation(); Animated.timing(hold, { toValue: 0, duration: 200, useNativeDriver: false }).start(); };
  const kc = KIND_COLOR[a.kind]; const R = 26; const CIRC = 2 * Math.PI * R; const frac = left / total;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[s.dim, { opacity: up.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] }]}>
        <View style={s.grab} />
        <View style={s.sheetHead}>
          <Ionicons name="hand-left" size={18} color={K.amber} />
          <Text style={s.sheetTitle}>Payment needs your OK</Text>
          <View style={{ flex: 1 }} />
          <View style={s.ring}>
            <Svg width={64} height={64}>
              <Circle cx={32} cy={32} r={R} stroke={K.line} strokeWidth={5} fill="none" />
              <Circle cx={32} cy={32} r={R} stroke={left < 10 ? K.red : K.orange} strokeWidth={5} fill="none" strokeDasharray={`${CIRC}`} strokeDashoffset={CIRC * (1 - frac)} strokeLinecap="round" rotation={-90} origin="32,32" />
            </Svg>
            <Text style={[s.ringText, left < 10 && { color: K.red }]}>{mm}</Text>
          </View>
        </View>
        <View style={s.merchant}>
          <View style={[s.mIcon, { backgroundColor: kc.soft }]}><Ionicons name={KIND_ICON[a.kind]} size={24} color={kc.color} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.mShop}>{a.shop}</Text>
            <Text style={s.mItem} numberOfLines={1}>{a.item}</Text>
          </View>
        </View>
        <Text style={s.amount}>{rupees(a.price)}</Text>
        <Text style={s.reason}>✋ {a.reason}</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Tell the agent why (optional)" placeholderTextColor={K.faint} style={s.note} />
        <View style={s.simRow}>
          <Text style={s.simText}>Allow similar {kc.label.toLowerCase()} up to {rupees(a.price)} today</Text>
          <Switch value={similar} onValueChange={setSimilar} trackColor={{ true: K.green, false: K.line }} thumbColor="#fff" />
        </View>
        <Pressable disabled={busy || left === 0} onPressIn={startHold} onPressOut={stopHold} style={s.holdBtn}>
          <Animated.View style={[s.holdFill, { width: hold.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
          <Ionicons name="finger-print" size={20} color="#fff" />
          <Text style={s.holdText}>Hold to approve {rupees(a.price)}</Text>
        </Pressable>
        <Pressable disabled={busy || left === 0} onPress={() => answer("reject")} style={({ pressed }) => [s.decline, pressed && { opacity: 0.6 }]}>
          <Text style={s.declineText}>Decline</Text>
        </Pressable>
        <Text style={s.sheetFoot}>No answer before the timer ends? It is not bought. Limit: {rupees(limit)}</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  logo: { width: 32, height: 32, borderRadius: 16 },
  brand: { color: K.ink, fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, height: 30, backgroundColor: "rgba(255,255,255,0.05)" },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12.5, fontWeight: "900" },

  empty: { margin: 16, padding: 28, borderRadius: 20, backgroundColor: GL, borderWidth: 1, borderColor: EDGE, alignItems: "center", gap: 10 },
  emptyTitle: { color: K.ink, fontSize: 20, fontWeight: "900" },
  emptyText: { color: K.soft, fontSize: 14, textAlign: "center", lineHeight: 20 },

  hero: { marginHorizontal: 16, padding: 18, borderRadius: 20, backgroundColor: "rgba(40,22,90,0.55)", borderWidth: 1, borderColor: "rgba(167,139,250,0.55)", shadowColor: "#8B5CF6", shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } },
  heroKicker: { color: "#C4B5FD", fontSize: 11.5, fontWeight: "900", letterSpacing: 1.6 },
  heroMode: { color: "#EAF0FF", fontSize: 15, fontWeight: "800", marginTop: 3 },
  ticker: { color: "#fff", fontSize: 44, fontWeight: "900", letterSpacing: -1, marginTop: 6, fontVariant: ["tabular-nums"] },
  heroOf: { color: "rgba(255,255,255,0.55)", fontSize: 16, fontWeight: "800", marginBottom: 9 },
  bar: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden", marginTop: 10 },
  barFill: { height: 8, borderRadius: 4, backgroundColor: K.green },
  heroRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  heroSmall: { color: "rgba(255,255,255,0.75)", fontSize: 12.5, fontWeight: "700" },
  heroLimit: { color: K.amber, fontSize: 12.5, fontWeight: "800" },
  goal: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "600", marginTop: 8 },

  shelf: { marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 20, backgroundColor: GL, borderWidth: 1, borderColor: "rgba(34,211,238,0.3)" },
  shelfHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  kindDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  shelfKicker: { color: K.faint, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.4 },
  shelfTitle: { color: K.ink, fontSize: 16, fontWeight: "900" },
  tiles: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", padding: 10, paddingTop: 14, backgroundColor: "rgba(255,255,255,0.04)" },
  ribbon: { position: "absolute", top: -9, left: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ribbonText: { color: "#fff", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  tileShop: { color: K.ink, fontSize: 12.5, fontWeight: "900" },
  tileItem: { color: K.soft, fontSize: 11, fontWeight: "600", marginTop: 2, minHeight: 28 },
  tilePrice: { color: K.ink, fontSize: 17, fontWeight: "900", marginTop: 6, fontVariant: ["tabular-nums"] },
  tileRating: { color: K.amber, fontSize: 11.5, fontWeight: "800", marginTop: 2 },
  tileOver: { color: K.red, fontSize: 10.5, fontWeight: "900", marginTop: 4 },

  cart: { margin: 16, marginBottom: 12, padding: 16, borderRadius: 20, backgroundColor: GL, borderWidth: 1, borderColor: "rgba(52,211,153,0.3)" },
  cartHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  cartTitle: { color: K.ink, fontSize: 18, fontWeight: "900" },
  cartCount: { color: K.faint, fontSize: 12.5, fontWeight: "800" },
  cartEmpty: { color: K.faint, fontSize: 13, fontWeight: "600", paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  rowIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: K.ink, fontSize: 14.5, fontWeight: "800" },
  rowSub: { color: K.soft, fontSize: 12, fontWeight: "600", marginTop: 2 },
  rowPrice: { color: K.ink, fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12 },
  totalLabel: { color: K.soft, fontSize: 14, fontWeight: "800" },
  totalValue: { color: K.ink, fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] },

  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 16, backgroundColor: K.orange, paddingHorizontal: 20, marginTop: 4, overflow: "hidden" },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  error: { color: K.red, fontWeight: "700", fontSize: 13, textAlign: "center", marginTop: 10 },
  behind: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, marginBottom: 0, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: EDGE, backgroundColor: GL },
  behindText: { flex: 1, color: K.soft, fontSize: 13.5, fontWeight: "800" },
  behindSub: { color: K.faint, fontSize: 12, fontWeight: "700" },
  tech: { margin: 16, padding: 12, borderRadius: 16, backgroundColor: GL, borderWidth: 1, borderColor: EDGE },

  toast: { position: "absolute", top: 8, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, backgroundColor: "rgba(20,16,48,0.96)", borderWidth: 1, borderColor: "rgba(167,139,250,0.5)", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  toastText: { flex: 1, color: K.ink, fontSize: 14, fontWeight: "800" },

  dim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(2,4,10,0.72)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#100C26", borderTopWidth: 2, borderColor: "#FBBF24", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 26 },
  grab: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: K.line, marginBottom: 10 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { color: K.amber, fontSize: 15, fontWeight: "900", letterSpacing: 0.3 },
  ring: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  ringText: { position: "absolute", color: K.ink, fontSize: 13, fontWeight: "900", fontVariant: ["tabular-nums"] },
  merchant: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  mIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mShop: { color: K.ink, fontSize: 17, fontWeight: "900" },
  mItem: { color: K.soft, fontSize: 13, fontWeight: "600", marginTop: 2 },
  amount: { color: K.ink, fontSize: 46, fontWeight: "900", letterSpacing: -1, marginTop: 12, fontVariant: ["tabular-nums"] },
  reason: { color: K.amber, fontSize: 13.5, fontWeight: "800", marginTop: 2 },
  note: { marginTop: 14, borderRadius: 12, backgroundColor: K.bg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: K.ink, fontWeight: "600" },
  simRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  simText: { flex: 1, color: K.soft, fontSize: 13, fontWeight: "700" },
  holdBtn: { marginTop: 16, height: 58, borderRadius: 16, backgroundColor: "#0B3B2C", overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  holdFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: K.green },
  holdText: { color: "#EAFFF5", fontSize: 16.5, fontWeight: "900" },
  decline: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 6 },
  declineText: { color: K.red, fontSize: 15.5, fontWeight: "900" },
  sheetFoot: { color: K.faint, fontSize: 11.5, fontWeight: "600", textAlign: "center", marginTop: 4 },
});
