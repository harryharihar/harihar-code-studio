import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C, F, KIND, LOOP } from "../theme";
import type { RunEvent } from "../types";
import type { IconName } from "./ui";

// The loop as a dial: four arcs, the beat that just happened is coloured in.
// Next to it, what each beat means, in plain words.
export function LoopDial({ current, steps }: { current?: string; steps: number }) {
  const size = 128, stroke = 13, r = (size - stroke) / 2, c = size / 2;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!current) return;
    pulse.setValue(0.4);
    Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [current, steps, pulse]);

  const arc = (i: number) => {
    const a0 = ((-90 + i * 90 + 7) * Math.PI) / 180;
    const a1 = ((-90 + i * 90 + 83) * Math.PI) / 180;
    return `M ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
  };
  const now = current && KIND[current] && LOOP.includes(current as (typeof LOOP)[number]) ? KIND[current] : null;

  return (
    <View style={s.dialRow}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          {LOOP.map((k, i) => (
            <Path key={k} d={arc(i)} stroke={current === k ? KIND[k].color : C.paperDeep} strokeWidth={stroke} strokeLinecap="round" fill="none" />
          ))}
        </Svg>
        <Animated.View style={{ alignItems: "center", opacity: pulse }}>
          {now ? <Ionicons name={now.icon as IconName} size={22} color={now.color} /> : <Ionicons name="sync" size={22} color={C.faint} />}
          <Text style={[s.dialLabel, { color: now?.color ?? C.muted }]}>{now?.label ?? "LOOP"}</Text>
          <Text style={s.dialSteps}>{steps} {steps === 1 ? "tool call" : "tool calls"}</Text>
        </Animated.View>
      </View>

      <View style={{ flex: 1, gap: 9 }}>
        {LOOP.map((k, i) => {
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

// Three numbers that tell the story of a run.
export function RunStats({ events }: { events: RunEvent[] }) {
  const observed = events.filter((e) => e.kind === "observe").map((e) => ({ tool: e.title, r: parse(e.detail) }));
  const stats = [
    { label: "tasks added", value: observed.filter((o) => o.tool === "create_task" && o.r?.ok).length, color: C.green },
    { label: "tool calls", value: events.filter((e) => e.kind === "act").length, color: C.orange },
    { label: "self-fixes", value: observed.filter((o) => o.r && o.r.ok === false).length, color: C.plum },
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
          <Text style={[s.rowTitle, { color: look.color }]}>{look.title}</Text>
          <Text style={s.step}>#{n}</Text>
        </View>
        <Detail e={e} />
      </View>
    </Animated.View>
  );
}

// What happened, in plain words instead of raw JSON.
function Detail({ e }: { e: RunEvent }) {
  if (e.kind === "act") {
    // shown the way the call looks in code: name( key: value ), notes left out to keep it short
    const args = Object.entries(parse(e.detail) ?? {}).filter(([k]) => k !== "notes");
    return (
      <View style={s.code}>
        {args.length === 0 ? (
          <Text style={s.codeLine}>
            <Text style={s.codeFn}>{e.title}</Text>
            <Text style={s.codePunct}>()</Text>
          </Text>
        ) : (
          <>
            <Text style={s.codeLine}>
              <Text style={s.codeFn}>{e.title}</Text>
              <Text style={s.codePunct}>(</Text>
            </Text>
            {args.map(([k, v]) => (
              <Text key={k} style={[s.codeLine, s.codeIndent]} numberOfLines={1}>
                <Text style={s.codeKey}>{k}</Text>
                <Text style={s.codePunct}>: </Text>
                {typeof v === "number" ? <Text style={s.codeNum}>{v}</Text> : <Text style={s.codeStr}>"{String(v)}"</Text>}
                {k === "day" && <Text style={s.codeComment}>  // {niceDay(String(v))}</Text>}
              </Text>
            ))}
            <Text style={[s.codeLine, s.codePunct]}>)</Text>
          </>
        )}
      </View>
    );
  }

  if (e.kind === "observe") {
    const r = parse(e.detail);
    if (r && r.ok === false) return <Text style={[s.result, { color: C.red }]}>✕ {String(r.error)}  →  the agent will fix it</Text>;
    let text = "It worked";
    if (r?.saved) text = `Added to calendar: ${String(r.saved).replace(/^(\d{4}-\d{2}-\d{2}) · /, (_m, d) => `${niceDay(d)} — `)}`;
    else if (r?.date) text = `Today is ${niceDay(String(r.date))}`;
    else if (typeof r?.count === "number") text = `${r.count} tasks already on the calendar`;
    return <Text style={[s.result, { color: C.green }]}>✓ {text}</Text>;
  }

  if (e.kind === "goal") return <Text style={s.goal}>“{e.detail}”</Text>;
  return <Text style={[s.text, e.kind === "error" && { color: C.red }]}>{e.detail || e.title}</Text>;
}

function parse(s: string): Record<string, any> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
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
  codeIndent: { paddingLeft: 14 },
  codeFn: { color: "#FF9A5C", fontWeight: "700" },
  codePunct: { color: "#A89F90" },
  codeKey: { color: "#9DB4FF" },
  codeStr: { color: "#8EDDB5" },
  codeNum: { color: "#F5A3D4" },
  codeComment: { color: "#7D7466", fontStyle: "italic" },
  result: { fontSize: 13.5, fontWeight: "700", lineHeight: 19 },
});
