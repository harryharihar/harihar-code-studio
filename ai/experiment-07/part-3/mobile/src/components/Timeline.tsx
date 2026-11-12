import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C, F, KIND, LOOP, LOOP_OF, STEPS } from "../theme";
import type { RunEvent, Usage } from "../types";
import type { IconName } from "./ui";

// The planning engine as a dial: four arcs, the step that just happened is coloured in.
// Next to it, what each step means, in plain words.
export function PlanDial({ current, steps }: { current?: string; steps: number }) {
  const on = current && STEPS.includes(current as (typeof STEPS)[number]) ? current : undefined;
  return <Dial keys={STEPS} current={on} idle="PLAN" count={`${steps} ${steps === 1 ? "model call" : "model calls"}`} />;
}

// Part 3: the same dial for the execution loop: decide → act → retry → verify.
export function LoopDial({ current, steps }: { current?: string; steps: number }) {
  return <Dial keys={LOOP} current={current ? LOOP_OF[current] : undefined} idle="LOOP" count={`${steps} ${steps === 1 ? "model call" : "model calls"}`} />;
}

function Dial({ keys, current, idle, count }: { keys: readonly string[]; current?: string; idle: string; count: string }) {
  const size = 128, stroke = 13, r = (size - stroke) / 2, c = size / 2;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!current) return;
    pulse.setValue(0.4);
    Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [current, count, pulse]);

  const arc = (i: number) => {
    const a0 = ((-90 + i * 90 + 7) * Math.PI) / 180;
    const a1 = ((-90 + i * 90 + 83) * Math.PI) / 180;
    return `M ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
  };
  const now = current && KIND[current] ? KIND[current] : null;

  return (
    <View style={s.dialRow}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          {keys.map((k, i) => (
            <Path key={k} d={arc(i)} stroke={current === k ? KIND[k].color : C.paperDeep} strokeWidth={stroke} strokeLinecap="round" fill="none" />
          ))}
        </Svg>
        <Animated.View style={{ alignItems: "center", opacity: pulse }}>
          {now ? <Ionicons name={now.icon as IconName} size={22} color={now.color} /> : <Ionicons name="list" size={22} color={C.faint} />}
          <Text style={[s.dialLabel, { color: now?.color ?? C.muted }]}>{now?.label ?? idle}</Text>
          <Text style={s.dialSteps}>{count}</Text>
        </Animated.View>
      </View>

      <View style={{ flex: 1, gap: 9 }}>
        {keys.map((k, i) => {
          const on = current === k;
          return (
            <View key={k} style={[s.legend, on && { backgroundColor: KIND[k].soft }]}>
              <View style={[s.legendNum, { backgroundColor: on ? KIND[k].color : C.paperDeep }]}>
                <Text style={[s.legendNumText, { color: on ? "#fff" : C.muted }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.legendTitle, { color: KIND[k].color }]}>{KIND[k].label}</Text>
                <Text style={s.legendText} numberOfLines={2}>{KIND[k].meaning}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Part 3: what the run has spent against its limits, and what our code caught on the way.
export function LoopMeters({ usage, budget, events }: { usage: Usage; budget: Usage; events: RunEvent[] }) {
  const meters = [
    { label: "Steps", used: usage.steps, max: budget.steps, text: `${usage.steps} / ${budget.steps}` },
    { label: "Tokens", used: usage.tokens, max: budget.tokens, text: `${(usage.tokens / 1000).toFixed(1)}k / ${budget.tokens / 1000}k` },
    { label: "Time", used: usage.seconds, max: budget.seconds, text: `${usage.seconds}s / ${budget.seconds}s` },
  ];
  const checks = events.filter((e) => e.kind === "verify" && e.title !== "Not finished").map((e) => parseObj(e.detail).ok);
  const stats = [
    { label: "verified", value: checks.filter((x) => x === true).length, color: C.green },
    { label: "retries", value: events.filter((e) => e.kind === "retry").length, color: C.plum },
    { label: "caught", value: checks.filter((x) => x === false).length, color: C.orange },
    { label: "blocked", value: events.filter((e) => e.kind === "guard").length, color: C.red },
  ];
  return (
    <View>
      <View style={s.meters}>
        {meters.map((m) => {
          const f = Math.min(1, m.used / m.max);
          const color = f > 0.8 ? C.red : f > 0.5 ? C.orange : C.green;
          return (
            <View key={m.label} style={s.meterRow}>
              <Text style={s.meterLabel}>{m.label}</Text>
              <View style={s.meterTrack}>
                <View style={[s.meterFill, { width: `${Math.max(2, f * 100)}%`, backgroundColor: color }]} />
              </View>
              <Text style={s.meterText}>{m.text}</Text>
            </View>
          );
        })}
      </View>
      <View style={s.stats}>
        {stats.map((x, i) => (
          <View key={x.label} style={[s.stat, i > 0 && s.statDivider]}>
            <Text style={[s.statValue, { color: x.color }]}>{x.value}</Text>
            <Text style={s.statLabel}>{x.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Three numbers that tell the story of a planning run.
export function PlanStats({ events }: { events: RunEvent[] }) {
  const order = events.find((e) => e.kind === "order");
  const stats = [
    { label: "tasks planned", value: order ? (parseList(order.detail).length) : 0, color: C.green },
    { label: "model calls", value: events.filter((e) => e.kind === "ask" || e.kind === "repair").length, color: C.indigo },
    { label: "self-fixes", value: events.filter((e) => e.kind === "repair").length, color: C.plum },
  ];
  return (
    <View style={s.stats}>
      {stats.map((x, i) => (
        <View key={x.label} style={[s.stat, i > 0 && s.statDivider]}>
          <Text style={[s.statValue, { color: x.color }]}>{x.value}</Text>
          <Text style={s.statLabel}>{x.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Timeline({ events }: { events: RunEvent[] }) {
  return (
    <View>
      {events.map((e, i) => (
        <Row key={e.seq} e={e} n={i + 1} last={i === events.length - 1} />
      ))}
    </View>
  );
}

function Row({ e, n, last }: { e: RunEvent; n: number; last: boolean }) {
  const look = KIND[e.kind] ?? KIND.goal;
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [appear]);

  return (
    <Animated.View style={[s.row, { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <View style={s.rail}>
        <View style={[s.node, { backgroundColor: look.color }]}>
          <Ionicons name={look.icon as IconName} size={14} color="#fff" />
        </View>
        {!last && <View style={s.line} />}
      </View>
      <View style={[s.body, e.kind === "final" && s.finalBody]}>
        <View style={s.rowHead}>
          <Text style={[s.rowTitle, { color: look.color }]}>{e.kind === "final" ? e.title : look.title}</Text>
          <Text style={s.step}>#{n}</Text>
        </View>
        <Detail e={e} />
      </View>
    </Animated.View>
  );
}

// What happened, in plain words instead of raw JSON.
function Detail({ e }: { e: RunEvent }) {
  if (e.kind === "check") {
    const problems = parseList(e.detail);
    if (problems.length === 0) return <Text style={[s.result, { color: C.green }]}>✓ Checked · 0 problems</Text>;
    return (
      <View style={{ gap: 4 }}>
        {problems.map((p) => (
          <Text key={p} style={[s.result, { color: C.red }]}>✕ {p}</Text>
        ))}
      </View>
    );
  }
  if (e.kind === "order") {
    return (
      <View style={s.code}>
        <Text style={s.codeLine}>
          {parseList(e.detail).map((id, i) => (
            <Text key={id}>
              {i > 0 && <Text style={s.codePunct}> → </Text>}
              <Text style={s.codeFn}>{id}</Text>
            </Text>
          ))}
        </Text>
      </View>
    );
  }
  if (e.kind === "act") {
    const m = e.detail.match(/^(\w+)\((.*)\)$/);
    return (
      <View style={s.code}>
        <Text style={s.codeLine}>
          <Text style={s.codeFn}>{m?.[1] ?? e.detail}</Text>
          {m && <Text style={s.codePunct}>(</Text>}
          {m && <Text style={s.codeArg}>{m[2]}</Text>}
          {m && <Text style={s.codePunct}>)</Text>}
        </Text>
      </View>
    );
  }
  if (e.kind === "observe") {
    const bad = e.detail.startsWith("✕");
    return <Text style={[s.result, { color: bad ? C.red : C.inkSoft, fontWeight: bad ? "700" : "600" }]}>{e.detail}</Text>;
  }
  if (e.kind === "verify") {
    const v = parseObj(e.detail);
    if (v.ok) return <Text style={[s.result, { color: C.green }]}>✓ {v.text}</Text>;
    return (
      <View style={{ gap: 4 }}>
        {(v.problems ?? []).map((p: string) => (
          <Text key={p} style={[s.result, { color: C.red }]}>✕ {p}</Text>
        ))}
      </View>
    );
  }
  if (e.kind === "retry" || e.kind === "guard" || e.kind === "budget") {
    return <Text style={[s.result, { color: KIND[e.kind].color }]}>{e.title} · {e.detail}</Text>;
  }
  if (e.kind === "goal") return <Text style={s.goal}>“{e.detail}”</Text>;
  return <Text style={[s.text, e.kind === "error" && { color: C.red }]}>{e.detail || e.title}</Text>;
}

function parseObj(s: string): any {
  try {
    return JSON.parse(s) ?? {};
  } catch {
    return {};
  }
}

function parseList(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function niceDay(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const s = StyleSheet.create({
  dialRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  dialLabel: { fontSize: 13, fontWeight: "900", letterSpacing: 1.2, marginTop: 3 },
  dialSteps: { color: C.muted, fontSize: 10.5, fontWeight: "700", marginTop: 1 },
  legend: { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 6 },
  legendNum: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  legendNumText: { fontSize: 11, fontWeight: "900" },
  legendTitle: { fontSize: 11.5, fontWeight: "900", letterSpacing: 0.8 },
  legendText: { color: C.inkSoft, fontSize: 11.5, fontWeight: "500" },

  stats: { flexDirection: "row", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { borderLeftWidth: 1, borderLeftColor: C.line },
  statValue: { fontFamily: F.serif, fontSize: 28, fontWeight: "700" },
  statLabel: { color: C.muted, fontSize: 11.5, fontWeight: "700" },

  row: { flexDirection: "row", gap: 12 },
  rail: { width: 30, alignItems: "center" },
  node: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  line: { flex: 1, width: 2, backgroundColor: C.line, marginVertical: 4 },
  body: { flex: 1, paddingBottom: 18, paddingTop: 5 },
  finalBody: { backgroundColor: C.greenSoft, borderRadius: 16, padding: 12, marginBottom: 4 },
  rowHead: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  rowTitle: { fontSize: 14, fontWeight: "800" },
  step: { marginLeft: "auto", color: C.faint, fontSize: 11, fontWeight: "700" },

  goal: { color: C.ink, fontFamily: F.serif, fontSize: 16, lineHeight: 23, fontStyle: "italic" },
  text: { color: C.inkSoft, fontSize: 14, lineHeight: 20 },
  code: { backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  codeLine: { fontFamily: F.mono, fontSize: 12.5, lineHeight: 19, color: C.paper },
  codeFn: { color: "#FF9A5C", fontWeight: "700" },
  codePunct: { color: "#A89F90" },
  codeArg: { color: "#F6F0E4" },
  meters: { gap: 8, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  meterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  meterLabel: { width: 50, color: C.inkSoft, fontSize: 12, fontWeight: "800" },
  meterTrack: { flex: 1, height: 9, borderRadius: 5, backgroundColor: C.paperDeep, overflow: "hidden" },
  meterFill: { height: 9, borderRadius: 5 },
  meterText: { width: 92, textAlign: "right", color: C.muted, fontSize: 11.5, fontWeight: "700", fontFamily: F.mono },
  result: { fontSize: 13.5, fontWeight: "700", lineHeight: 19 },
});
