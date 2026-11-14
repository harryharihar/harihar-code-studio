import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Switch, Text, View, type ScrollViewInstance } from "react-native";
import { LoopDial, LoopMeters, Timeline } from "../../src/components/Timeline";
import { BrandHeader, Button, Screen, StatusPill } from "../../src/components/ui";
import { useMission } from "../../src/store";
import { C, F } from "../../src/theme";
import type { RunEvent, Task } from "../../src/types";

// The agent at work, told so anyone can follow it: one sentence about what it is doing right now,
// and a checklist where every task goes from "waiting" to "ordering" to "checked".
// The technical loop (dial, meters, raw steps) is still here, folded away under "Behind the scenes".
export default function Run() {
  const router = useRouter();
  const { tasks, loadTasks, exec, execute, pollExec, flaky, setFlaky, party, loadParty, goal, resume } = useMission();
  const running = exec.status === "running";
  const paused = exec.status === "interrupted"; // Part 4: the server stopped under this run
  const scroll = useRef<ScrollViewInstance>(null);
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState(false);

  useFocusEffect(useCallback(() => { loadTasks(); loadParty(); }, [loadTasks, loadParty]));

  // While the agent works, ask the server for news once a second.
  useEffect(() => {
    if (!running || !exec.id) return;
    const t = setInterval(pollExec, 1000);
    return () => clearInterval(t);
  }, [running, exec.id, pollExec]);

  // Reveal events one by one, so a viewer can follow every move.
  const events = exec.events;
  useEffect(() => {
    if (shown > events.length) return setShown(events.length);
    if (shown === events.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 420);
    return () => clearTimeout(t);
  }, [events.length, shown]);

  const visible = events.slice(0, shown);
  const live = running || shown < events.length;
  const started = visible.length > 0;
  const now = visible.at(-1);
  const final = !live ? visible.find((e) => e.kind === "final" || e.kind === "budget" || e.kind === "error") : undefined;

  // where each task stands, read from what the viewer has seen so far
  const items = party?.items ?? [];
  const state = (t: Task) => {
    const okEv = visible.some((e) => e.kind === "verify" && e.title === `${t.ref} verified`);
    const caught = visible.some((e) => e.kind === "verify" && e.title === `${t.ref} failed the check`);
    const lastBook = [...visible].reverse().find((e) => e.kind === "act" && orderRef(e) === t.ref);
    const ok = started ? okEv : t.verified;
    const booking = live && !ok && !!lastBook && now === lastBook;
    const order = items.find((e) => e.id === t.id)?.order;
    return { ok, caught, booking, when: ok && order ? rupees(order.price) : null, shop: ok && order ? order.shop : null };
  };
  const done = tasks.filter((t) => state(t).ok).length;
  const retries = visible.filter((e) => e.kind === "retry").length;
  const caught = visible.filter((e) => e.kind === "verify" && e.title.endsWith("failed the check")).length;
  const allBooked = tasks.length > 0 && items.length > 0 && items.every((i) => i.order);
  const money = party?.budget ?? 0;
  const spentNow = items.filter((i) => tasks.some((t) => t.id === i.id && state(t).ok)).reduce((n, i) => n + (i.order?.price ?? 0), 0);

  useEffect(() => {
    if (live && caught) setTimeout(() => scroll.current?.scrollTo({ y: 0, animated: true }), 50);
  }, [caught, live]);

  const offline = running && !!exec.error; // the server is down right now
  const say = offline
    ? { text: "The server just stopped! Don’t worry: every order so far is saved in the database.", tone: "warn" as const }
    : paused && !live
      ? { text: `The server stopped while I was working. ${done} of ${tasks.length} are ordered and saved. Tap Resume and I’ll go on from there.`, tone: "warn" as const }
      : sentence(now, live, final, tasks.length, done, tasks);

  return (
    <Screen>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <BrandHeader tag="AI AGENT" title="Mission Control" subtitle="Your AI agent orders everything in the plan" right={<StatusPill status={offline ? "failed" : live ? "running" : exec.status} />} />

        <View style={s.wrap}>
          {tasks.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}><Ionicons name="sparkles-outline" size={30} color={C.orange} /></View>
              <Text style={s.emptyTitle}>Nothing to do yet</Text>
              <Text style={s.emptyText}>Give your agent a goal on the Mission tab and accept the plan. Then it orders every task for you, within your budget.</Text>
              <View style={{ alignSelf: "stretch", marginTop: 20 }}><Button title="Give it a goal" onPress={() => router.push("/")} /></View>
            </View>
          ) : (
            <>
              {/* 1 · the agent, in one sentence */}
              <AgentCard text={say.text} tone={say.tone} live={live} goal={goal} />

              {/* 2 · the job, task by task */}
              <View style={s.listHead}>
                <Text style={s.h2}>Your tasks</Text>
                <Text style={s.progress}>{done} of {tasks.length} ordered</Text>
              </View>
              <View style={s.bar}><View style={[s.barFill, { width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }]} /></View>
              <View style={s.list}>
                {tasks.map((t, i) => <TaskRow key={t.id} task={t} {...state(t)} last={i === tasks.length - 1} />)}
              </View>

              {/* 3 · what happened, in plain words */}
              {started && (
                <View style={s.stats}>
                  <Stat icon="refresh" color={C.plum} value={retries} label={retries === 1 ? "retry" : "retries"} sub="no answer, tried again" />
                  <Stat icon="shield-checkmark" color={C.red} value={caught} label={caught === 1 ? "mistake caught" : "mistakes caught"} sub="checked, then fixed" />
                  <Stat icon="wallet-outline" color={C.orange} value={rupees(spentNow)} label="spent" sub={`of ${rupees(money)} budget`} />
                </View>
              )}

              {final && (
                <Pressable onPress={() => router.push("/party")} style={({ pressed }) => [s.doneCard, exec.status !== "done" && { backgroundColor: C.red }, pressed && { opacity: 0.88 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.doneTitle}>{exec.status === "done" ? "Your party is ready" : final.title}</Text>
                    <Text style={s.doneSub}>{exec.status === "done" ? `Every order checked · ${rupees(spentNow)} of ${rupees(money)} · open Party` : "See what was ordered on Party"}</Text>
                  </View>
                  <View style={s.doneDisc}><Ionicons name={exec.status === "done" ? "arrow-forward" : "stopwatch"} size={20} color={exec.status === "done" ? C.green : C.red} /></View>
                </Pressable>
              )}

              {/* Part 4 · the run was interrupted: continue it from the last checkpoint */}
              {paused && !live && exec.id && (
                <View style={s.paused}>
                  <Text style={s.pausedKicker}>CHECKPOINT SAVED</Text>
                  <Text style={s.pausedTitle}>{done} of {tasks.length} already ordered</Text>
                  <Text style={s.pausedText}>The server stopped mid-run. Resume skips what’s done: nothing is ordered or paid for twice.</Text>
                  <Pressable onPress={() => resume(exec.id!)} style={({ pressed }) => [s.resumeBtn, pressed && { opacity: 0.85 }]}>
                    <Text style={s.resumeText}>Resume</Text>
                    <Ionicons name="play-forward" size={18} color={C.ink} />
                  </Pressable>
                </View>
              )}

              {/* 4 · controls */}
              <View style={s.controls}>
                <View style={s.flaky}>
                  <Ionicons name="thunderstorm-outline" size={22} color={C.plum} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.flakyTitle}>Practice mode: unreliable shops</Text>
                    <Text style={s.flakyText}>The shops fail twice on purpose. Watch the agent cope.</Text>
                  </View>
                  <Switch value={flaky} onValueChange={setFlaky} disabled={running} trackColor={{ true: C.plum, false: C.paperDeep }} thumbColor="#fff" />
                </View>
                {paused ? null : allBooked && !running ? (
                  <Button title="Run again from scratch" icon="refresh" onPress={() => { setShown(0); execute(true); }} />
                ) : (
                  <Button title={running ? "Your agent is working…" : "Let the agent do it"} icon="play" busy={running} disabled={running} onPress={() => { setShown(0); execute(false); }} />
                )}
                {!!exec.error && (
                  <View style={s.error}>
                    <Ionicons name="cloud-offline-outline" size={16} color={C.red} />
                    <Text style={s.errorText}>{offline ? "Server offline. Waiting for it to come back…" : exec.error}</Text>
                  </View>
                )}
              </View>

              {/* 5 · behind the scenes, for the curious */}
              <Pressable onPress={() => setOpen((o) => !o)} style={s.behind}>
                <Ionicons name="code-slash" size={16} color={C.inkSoft} />
                <Text style={s.behindText}>Behind the scenes</Text>
                <Text style={s.behindSub}>{visible.length} steps</Text>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
              </Pressable>
              {open && (
                <View style={s.tech}>
                  <LoopDial current={live ? now?.kind : undefined} steps={exec.usage.steps} />
                  <LoopMeters usage={exec.usage} budget={exec.budget} events={visible} />
                  {started && <Timeline events={visible} />}
                </View>
              )}
            </>
          )}
          <Text style={s.footer}>Built on Harihar Code Studio</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

// the agent's "face": a pulsing orb and one plain sentence
function AgentCard({ text, tone, live, goal }: { text: string; tone: "calm" | "work" | "warn" | "good"; live: boolean; goal: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!live) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);
  const col = { calm: C.green, work: C.orange, warn: C.red, good: C.green }[tone];
  return (
    <View style={s.agent}>
      <View style={s.agentTop}>
        <View style={s.orbWrap}>
          <Animated.View style={[s.orbRing, { borderColor: col, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]} />
          <View style={[s.orb, { backgroundColor: col }]}><Ionicons name="sparkles" size={20} color="#fff" /></View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.agentName}>Your AI agent</Text>
          <Text style={[s.agentState, { color: col }]}>{live ? "working now" : tone === "good" ? "done" : "ready"}</Text>
        </View>
      </View>
      <Text style={s.say}>{text}</Text>
      {!!goal && <Text style={s.goal} numberOfLines={2}>Goal: “{goal}”</Text>}
    </View>
  );
}

function TaskRow({ task, ok, caught, booking, when, shop, last }: { task: Task; ok: boolean; caught: boolean; booking: boolean; when: string | null; shop: string | null; last: boolean }) {
  return (
    <View style={[s.row, !last && s.rowLine]}>
      <View style={[s.status, ok ? { backgroundColor: C.greenSoft } : booking ? { backgroundColor: C.orangeSoft } : { backgroundColor: C.paperDeep }]}>
        {ok ? <Ionicons name="checkmark" size={16} color={C.green} /> : booking ? <ActivityIndicator size="small" color={C.orange} /> : <Ionicons name="time-outline" size={15} color={C.faint} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, !ok && !booking && { color: C.inkSoft }]} numberOfLines={1}>{task.title}</Text>
        <Text style={[s.rowSub, booking && { color: C.orange }, ok && { color: C.green }, caught && !ok && { color: C.red }]}>
          {ok ? (caught ? `Lost once, re-ordered${shop ? ` · ${shop}` : ""} ✓` : shop ? `${shop} · ordered and checked` : "Ordered and checked") : caught ? "Lost by the shop! Ordering again…" : booking ? "Ordering now…" : `Waiting · about ${rupees(task.cost)}`}
        </Text>
      </View>
      {when && <Text style={s.when}>{when}</Text>}
    </View>
  );
}

function Stat({ icon, color, value, label, sub }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: number | string; label: string; sub: string }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

// ---- turning the agent's raw steps into one plain sentence
const orderRef = (e: RunEvent) => /place_order\((\w+)/.exec(e.detail)?.[1];
const orderShop = (e: RunEvent) => /place_order\(\w+, ([^)]+)\)/.exec(e.detail)?.[1] ?? "a shop";
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function sentence(e: RunEvent | undefined, live: boolean, final: RunEvent | undefined, total: number, done: number, tasks: Task[]): { text: string; tone: "calm" | "work" | "warn" | "good" } {
  const name = (ref?: string) => tasks.find((t) => t.ref === ref)?.title ?? "a task";
  if (!e) return done === total && total ? { text: `All ${total} things are already ordered.`, tone: "good" } : { text: "I have a party to arrange. Tap the button and watch me work.", tone: "calm" };
  if (!live && final) {
    if (final.kind === "final" && done === total) return { text: "Done. Everything is ordered, within budget, and I checked every order.", tone: "good" };
    return { text: `I stopped safely: ${final.title}.`, tone: "warn" };
  }
  switch (e.kind) {
    case "goal": return { text: "Starting. First I look at the plan and the budget.", tone: "work" };
    case "think": return { text: "Thinking about the next step…", tone: "work" };
    case "act":
      if (e.title === "place_order") return { text: `Ordering “${name(orderRef(e))}” from ${orderShop(e)}…`, tone: "work" };
      if (e.title === "check_orders") return { text: "Reading the order list…", tone: "work" };
      return { text: "Finding the next task and comparing shops…", tone: "work" };
    case "observe": return { text: "Got an answer from the shop.", tone: "work" };
    case "retry": return { text: "The shop didn’t answer. No problem: trying again.", tone: "warn" };
    case "verify":
      if (e.title.endsWith("failed the check")) return { text: `Caught it! The shop said “ordered”, but “${name(e.title.split(" ")[0])}” isn’t in the order list. Ordering it again.`, tone: "warn" };
      if (e.title.endsWith("verified")) return { text: `Checked: “${name(e.title.split(" ")[0])}” is really in the order list.`, tone: "good" };
      return { text: "Something is missing. Going back to finish it.", tone: "warn" };
    case "guard": return { text: "I’m repeating myself, so that step is blocked.", tone: "warn" };
    case "resume": return { text: `I’m back! ${e.detail.split(" · ")[0].replace("already ordered: not ordered again", "were already ordered, so I won’t order them again")}.`, tone: "good" };
    case "budget": return { text: "My limit is used up, so I stopped safely.", tone: "warn" };
    default: return { text: e.title, tone: "work" };
  }
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 14 },
  emptyBox: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 18, borderRadius: 24, backgroundColor: C.card },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.orangeSoft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: C.ink, fontFamily: F.serif, fontSize: 22, fontWeight: "700", marginTop: 14 },
  emptyText: { color: C.muted, fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },

  agent: { backgroundColor: C.ink, borderRadius: 26, padding: 20 },
  agentTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  orbWrap: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  orbRing: { position: "absolute", width: 46, height: 46, borderRadius: 23, borderWidth: 3 },
  orb: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  agentName: { color: C.paper, fontSize: 15, fontWeight: "800" },
  agentState: { fontSize: 12, fontWeight: "800", marginTop: 2, letterSpacing: 0.3 },
  say: { color: "#FFFFFF", fontFamily: F.serif, fontSize: 22, lineHeight: 29, fontWeight: "700", marginTop: 16 },
  goal: { color: "rgba(246,240,228,0.55)", fontSize: 12.5, fontWeight: "600", marginTop: 12 },

  listHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 6, paddingHorizontal: 2 },
  h2: { color: C.ink, fontFamily: F.serif, fontSize: 22, fontWeight: "700" },
  progress: { color: C.muted, fontSize: 12.5, fontWeight: "700" },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.paperDeep, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.green },
  list: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, shadowColor: "#3A2A14", shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  status: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: C.ink, fontSize: 14.5, fontWeight: "800" },
  rowSub: { color: C.faint, fontSize: 12, fontWeight: "700", marginTop: 2 },
  when: { color: C.ink, fontSize: 12.5, fontWeight: "800", fontVariant: ["tabular-nums"] },

  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12 },
  statValue: { fontFamily: F.serif, fontSize: 24, fontWeight: "700", marginTop: 6 },
  statLabel: { color: C.ink, fontSize: 12, fontWeight: "800" },
  statSub: { color: C.muted, fontSize: 10.5, fontWeight: "600", marginTop: 2 },

  doneCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 22, backgroundColor: C.green },
  doneTitle: { color: "#fff", fontFamily: F.serif, fontSize: 20, fontWeight: "700" },
  doneSub: { color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: "600", marginTop: 2 },
  doneDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },

  controls: { gap: 12 },
  paused: { backgroundColor: "#22304F", borderRadius: 6, padding: 18, gap: 6 },
  pausedKicker: { color: "#9FB4E8", fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  pausedTitle: { color: "#FFFFFF", fontFamily: F.serif, fontSize: 22, fontWeight: "700" },
  pausedText: { color: "rgba(255,255,255,0.75)", fontSize: 13.5, fontWeight: "600", lineHeight: 19 },
  resumeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, height: 50, paddingHorizontal: 20, borderRadius: 6, backgroundColor: "#F6F0E4" },
  resumeText: { color: C.ink, fontSize: 16, fontWeight: "900" },
  flaky: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14, backgroundColor: C.plumSoft },
  flakyTitle: { color: C.plum, fontSize: 13.5, fontWeight: "900" },
  flakyText: { color: C.inkSoft, fontSize: 12, fontWeight: "600", marginTop: 2 },
  error: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.redSoft, borderRadius: 12, padding: 10 },
  errorText: { flex: 1, color: C.red, fontWeight: "600", fontSize: 13 },

  behind: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line },
  behindText: { flex: 1, color: C.inkSoft, fontSize: 13.5, fontWeight: "800" },
  behindSub: { color: C.muted, fontSize: 12, fontWeight: "700" },
  tech: { gap: 12, backgroundColor: C.card, borderRadius: 20, padding: 14 },
  footer: { color: C.faint, fontSize: 11.5, fontWeight: "700", textAlign: "center", marginTop: 10, letterSpacing: 0.4 },
});
