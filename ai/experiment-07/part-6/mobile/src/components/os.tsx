import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Line, RadialGradient, Rect, Stop, LinearGradient as SvgLinear, Text as SvgText } from "react-native-svg";
import { C, F } from "../theme";
import type { IconName } from "./ui";

// Part 5: "Agent OS", the look of the whole app.
// Deep space background with glowing colour fields and a faint HUD grid, glass panels with corner brackets,
// gradient titles and glowing gradient buttons. One colour per agent moment:
// violet = the agent · cyan = acting · green = done · amber = it asks you · red = blocked.
export const OS = {
  violet: "#8B5CF6", violetHi: "#C4B5FD", pink: "#EC4899", cyan: "#22D3EE", green: "#34D399", amber: "#FBBF24", red: "#F87171",
  text: "#EEF2FF", soft: "#A5B0CF", faint: "#5D6888", glass: "rgba(255,255,255,0.045)", edge: "rgba(167,139,250,0.28)",
};
export const GRAD = ["#8B5CF6", "#EC4899", "#22D3EE"] as const;
const logo = require("../../assets/images/hcs-logo.png");

// the background of every screen: two colour fields and a HUD grid
export function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={["#0C0722", "#060914", "#04121A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="v" cx="12%" cy="8%" r="55%"><Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.38" /><Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" /></RadialGradient>
          <RadialGradient id="c" cx="95%" cy="70%" r="55%"><Stop offset="0" stopColor="#22D3EE" stopOpacity="0.22" /><Stop offset="1" stopColor="#22D3EE" stopOpacity="0" /></RadialGradient>
          <RadialGradient id="p" cx="70%" cy="0%" r="40%"><Stop offset="0" stopColor="#EC4899" stopOpacity="0.18" /><Stop offset="1" stopColor="#EC4899" stopOpacity="0" /></RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#v)" />
        <Rect width="100%" height="100%" fill="url(#c)" />
        <Rect width="100%" height="100%" fill="url(#p)" />
        {Array.from({ length: 30 }).map((_, i) => (
          <Line key={`h${i}`} x1="0" x2="100%" y1={i * 44} y2={i * 44} stroke="#FFFFFF" strokeOpacity="0.025" strokeWidth="1" />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <Line key={`v${i}`} y1="0" y2="100%" x1={i * 44} x2={i * 44} stroke="#FFFFFF" strokeOpacity="0.025" strokeWidth="1" />
        ))}
      </Svg>
    </View>
  );
}

export function OSScreen({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#060914" }}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>{children}</SafeAreaView>
    </View>
  );
}

// a glass panel with sci-fi corner brackets
export function Glass({ children, style, glow, hud = true, tint }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; glow?: string; hud?: boolean; tint?: string }) {
  const c = glow ?? OS.violet;
  return (
    <View style={[s.glass, tint ? { backgroundColor: tint } : null, glow ? { borderColor: c + "88", shadowColor: c, shadowOpacity: 0.45, shadowRadius: 18 } : null, style]}>
      {hud && (
        <>
          <View style={[s.corner, { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2, borderColor: c }]} />
          <View style={[s.corner, { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2, borderColor: c }]} />
          <View style={[s.corner, { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: c }]} />
          <View style={[s.corner, { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderColor: c }]} />
        </>
      )}
      {children}
    </View>
  );
}

// a big title painted with the violet → pink → cyan gradient
export function GTitle({ text, size = 36, colors = GRAD }: { text: string; size?: number; colors?: readonly string[] }) {
  const h = Math.round(size * 1.22);
  return (
    <Svg height={h} width="100%">
      <Defs>
        <SvgLinear id="t" x1="0" y1="0" x2="1" y2="0">
          {colors.map((c, i) => <Stop key={c} offset={String(i / (colors.length - 1))} stopColor={c} />)}
        </SvgLinear>
      </Defs>
      <SvgText x="0" y={size} fontSize={size} fontWeight="900" fill="url(#t)" letterSpacing={-0.8}>{text}</SvgText>
    </Svg>
  );
}

export function Kicker({ text, color = OS.violetHi }: { text: string; color?: string }) {
  return <Text style={[s.kicker, { color }]}>{text}</Text>;
}

// the top of every screen: channel, a live dot, the gradient title and one line
export function OSHeader({ kicker, title, sub, right }: { kicker: string; title: string; sub?: string; right?: ReactNode }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(p, { toValue: 1, duration: 900, useNativeDriver: true }), Animated.timing(p, { toValue: 0, duration: 900, useNativeDriver: true })]));
    l.start();
    return () => l.stop();
  }, [p]);
  return (
    <View style={s.header}>
      <View style={s.brandRow}>
        <Image source={logo} style={s.logo} />
        <Text style={s.brand} numberOfLines={1}>HARIHAR CODE STUDIO</Text>
        {!right && <Animated.View style={[s.live, { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }]} />}
        {!right && <Text style={s.liveText}>AGENT OS</Text>}
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <Kicker text={kicker} />
      <GTitle text={title} />
      {!!sub && <Text style={s.sub}>{sub}</Text>}
    </View>
  );
}

// the main action: a glowing gradient button
export function GButton({ title, icon = "arrow-forward", onPress, disabled, busy, colors = GRAD }: { title: string; icon?: IconName; onPress: () => void; disabled?: boolean; busy?: boolean; colors?: readonly string[] }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} style={({ pressed }) => [s.btnWrap, (disabled && !busy) && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <LinearGradient colors={colors as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
        {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name={icon} size={19} color="#fff" />}
        <Text style={s.btnText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// a small rounded label with a glowing dot
export function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={[s.tag, { borderColor: color + "66", backgroundColor: color + "18" }]}>
      <View style={[s.tagDot, { backgroundColor: color }]} />
      <Text style={[s.tagText, { color }]}>{text}</Text>
    </View>
  );
}

// an icon in a glowing tile, coloured by kind
export function IconTile({ icon, color, size = 42, dim }: { icon: IconName; color: string; size?: number; dim?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: "center", justifyContent: "center", backgroundColor: dim ? "rgba(255,255,255,0.04)" : color + "22", borderWidth: 1, borderColor: dim ? "rgba(255,255,255,0.06)" : color + "66", shadowColor: color, shadowOpacity: dim ? 0 : 0.5, shadowRadius: 10 }}>
      <Ionicons name={icon} size={size * 0.48} color={dim ? OS.faint : color} />
    </View>
  );
}

// a slow pulse, for anything that is live
export function usePulse(on = true, ms = 1100) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) { p.setValue(0); return; }
    const l = Animated.loop(Animated.timing(p, { toValue: 1, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [on, ms, p]);
  return p;
}

const s = StyleSheet.create({
  glass: { backgroundColor: OS.glass, borderWidth: 1, borderColor: OS.edge, borderRadius: 18, padding: 16, shadowOffset: { width: 0, height: 0 } },
  corner: { position: "absolute", width: 14, height: 14 },
  header: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  logo: { width: 26, height: 26, borderRadius: 13 },
  brand: { color: OS.soft, fontSize: 11, fontWeight: "900", letterSpacing: 1.6, fontFamily: F.mono },
  live: { width: 7, height: 7, borderRadius: 4, backgroundColor: OS.green, marginLeft: 6 },
  liveText: { color: OS.green, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.4, fontFamily: F.mono },
  kicker: { fontSize: 11.5, fontWeight: "900", letterSpacing: 2.4, fontFamily: F.mono, marginBottom: 2 },
  sub: { color: OS.soft, fontSize: 14.5, fontWeight: "600", marginTop: 2, lineHeight: 20 },
  btnWrap: { borderRadius: 18, shadowColor: "#8B5CF6", shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  btn: { height: 58, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  btnText: { color: "#fff", fontSize: 16.5, fontWeight: "900", letterSpacing: 0.3 },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, fontWeight: "900", letterSpacing: 1, fontFamily: F.mono },
});
export { C };
