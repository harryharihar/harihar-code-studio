import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, F } from "../theme";

const logo = require("../../assets/images/hcs-logo.png");

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

// Channel branding on every screen: logo + studio name on top, the screen title in a big serif.
export function BrandHeader({ title, subtitle, right, tag }: { title: string; subtitle: string; right?: ReactNode; tag?: string }) {
  return (
    <View style={s.header}>
      <View style={s.brandRow}>
        <Image source={logo} style={s.logo} />
        <Text style={s.studio}>Harihar Code Studio</Text>
        <View style={{ flex: 1 }} />
        {right}
      </View>
      {!!tag && <Text style={s.tag}>{tag}</Text>}
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status: "idle" | "running" | "done" | "failed" | "interrupted" }) {
  const look = {
    idle: { text: "Ready", color: C.green },
    running: { text: "Working", color: C.orange },
    done: { text: "Complete", color: C.green },
    failed: { text: "Stopped", color: C.red },
    interrupted: { text: "Paused", color: C.indigo },
  }[status];
  return (
    <View style={[s.pill, { borderColor: look.color }]}>
      {status === "running" ? <ActivityIndicator size="small" color={look.color} style={{ transform: [{ scale: 0.65 }], marginHorizontal: -4 }} /> : <View style={[s.dot, { backgroundColor: look.color }]} />}
      <Text style={[s.pillText, { color: look.color }]}>{look.text}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{children}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

// Solid ink button with an orange arrow disc: the one main action on a screen.
export function Button({ title, icon = "arrow-forward", onPress, disabled, busy }: { title: string; icon?: IconName; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, busy && s.btnBusy, { opacity: disabled && !busy ? 0.4 : pressed ? 0.85 : 1 }]}
    >
      <Text style={[s.btnText, busy && { color: C.inkSoft }]}>{title}</Text>
      <View style={[s.btnDisc, busy && { backgroundColor: C.paperDeep }]}>
        {busy ? <ActivityIndicator size="small" color={C.orange} /> : <Ionicons name={icon} size={18} color="#fff" />}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tag: { alignSelf: "flex-start", marginTop: 14, marginBottom: -4, color: C.orange, backgroundColor: C.orangeSoft, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 15 },
  studio: { color: C.inkSoft, fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  title: { color: C.ink, fontFamily: F.serif, fontSize: 34, fontWeight: "700", letterSpacing: -0.6, marginTop: 14 },
  subtitle: { color: C.muted, fontSize: 14, fontWeight: "600", marginTop: 2 },

  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1.5, backgroundColor: C.card },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: "800" },

  card: { backgroundColor: C.card, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: C.line },
  sectionRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  section: { color: C.ink, fontFamily: F.serif, fontSize: 19, fontWeight: "700" },

  btn: { flexDirection: "row", alignItems: "center", backgroundColor: C.ink, borderRadius: 999, paddingLeft: 22, paddingRight: 7, height: 58 },
  btnBusy: { backgroundColor: C.paperDeep },
  btnText: { flex: 1, color: C.paper, fontSize: 16.5, fontWeight: "800", letterSpacing: 0.2 },
  btnDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.orange, alignItems: "center", justifyContent: "center" },
});
