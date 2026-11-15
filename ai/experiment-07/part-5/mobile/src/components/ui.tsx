import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { C, F } from "../theme";
import { GButton, Glass, OS, OSHeader, OSScreen } from "./os";

export type IconName = ComponentProps<typeof Ionicons>["name"];

// Part 5 "Agent OS": every screen sits on the glowing deep-space backdrop.
export function Screen({ children }: { children: ReactNode }) {
  return <OSScreen>{children}</OSScreen>;
}

// Channel branding + a gradient title on every screen.
export function BrandHeader({ title, subtitle, right, tag }: { title: string; subtitle: string; right?: ReactNode; tag?: string }) {
  return <OSHeader kicker={tag ?? "AGENTIC AI"} title={title} sub={subtitle} right={right} />;
}

export function StatusPill({ status }: { status: "idle" | "running" | "done" | "failed" | "interrupted" | "waiting" }) {
  const look = {
    idle: { text: "READY", color: OS.green },
    running: { text: "WORKING", color: OS.cyan },
    done: { text: "COMPLETE", color: OS.green },
    failed: { text: "STOPPED", color: OS.red },
    interrupted: { text: "PAUSED", color: OS.cyan },
    waiting: { text: "NEEDS YOU", color: OS.amber },
  }[status];
  return (
    <View style={[s.pill, { borderColor: look.color + "88", backgroundColor: look.color + "18", shadowColor: look.color }]}>
      {status === "running" ? <ActivityIndicator size="small" color={look.color} style={{ transform: [{ scale: 0.6 }], marginHorizontal: -5 }} /> : <View style={[s.dot, { backgroundColor: look.color }]} />}
      <Text style={[s.pillText, { color: look.color }]}>{look.text}</Text>
    </View>
  );
}

// a glass panel with HUD corners
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <Glass style={style}>{children}</Glass>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <View style={s.sectionBar} />
      <Text style={s.section}>{children}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

// the one main action on a screen: a glowing gradient button
export function Button({ title, icon = "arrow-forward", onPress, disabled, busy }: { title: string; icon?: IconName; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  return <GButton title={title} icon={icon} onPress={onPress} disabled={disabled} busy={busy} />;
}

const s = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10.5, fontWeight: "900", letterSpacing: 1.2, fontFamily: F.mono },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: OS.cyan, shadowColor: OS.cyan, shadowOpacity: 0.9, shadowRadius: 6 },
  section: { color: C.ink, fontSize: 13, fontWeight: "900", letterSpacing: 1.6, textTransform: "uppercase", fontFamily: F.mono },
});
