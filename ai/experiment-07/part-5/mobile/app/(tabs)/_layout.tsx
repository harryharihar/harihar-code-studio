import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GRAD, OS } from "../../src/components/os";
import type { IconName } from "../../src/components/ui";
import { MailSheet } from "../../src/components/MailSheet";
import { useMail } from "../../src/mail";
import { F } from "../../src/theme";

// Part 5: a floating glass dock. The Live cart sits in the middle as a glowing orb: that is where the agent works.
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
const TABS: Record<string, { label: string; on: IconName; off: IconName }> = {
  ask: { label: "Rules", on: "shield-checkmark", off: "shield-checkmark-outline" },
  index: { label: "Inbox", on: "mail", off: "mail" },
  sent: { label: "Sent", on: "paper-plane", off: "paper-plane-outline" },
};

function Dock({ state, navigateToTab }: BottomTabBarProps) {
  const pending = useMail((st) => (st.question ? 1 : 0));
  const insets = useSafeAreaInsets();
  // the payment sheet takes the whole bottom of the screen: hide the dock while it is open
  if (pending > 0) return null;
  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom - 8, 8) }]}>
      <View style={s.dock}>
        {state.routes.map((r, i) => {
          const t = TABS[r.name];
          if (!t) return null;
          const focused = state.index === i;
          const go = () => { if (!focused) navigateToTab(r.key); };
          if (r.name === "index") {
            return (
              <Pressable key={r.key} onPress={go} style={s.orbSlot} accessibilityRole="button" accessibilityLabel="Inbox">
                <LinearGradient colors={GRAD as unknown as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.orb, focused && s.orbOn]}>
                  <Ionicons name="mail" size={26} color="#fff" />
                </LinearGradient>
                <Text style={[s.label, { color: focused ? OS.text : OS.soft, marginTop: 3 }]}>INBOX</Text>
              </Pressable>
            );
          }
          const badge = r.name === "ask" && pending > 0;
          return (
            <Pressable key={r.key} onPress={go} style={s.item} accessibilityRole="button" accessibilityLabel={t.label}>
              {focused && <View style={s.glow} />}
              <Ionicons name={focused ? t.on : t.off} size={21} color={focused ? OS.violetHi : OS.faint} />
              <Text style={[s.label, { color: focused ? OS.violetHi : OS.faint }]} numberOfLines={1}>{t.label.toUpperCase()}</Text>
              {badge && <View style={s.badge}><Text style={s.badgeText}>{pending}</Text></View>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// The agent's question pops up on top of ANY screen. The phone asks the server once a second.
function AskOverlay() {
  const { load, question, items } = useMail();
  useEffect(() => { load(); const t = setInterval(load, 1000); return () => clearInterval(t); }, [load]);
  const m = question ? items.find((x) => x.id === question.emailId) : undefined;
  return question && m ? <MailSheet key={`${question.emailId}-${question.round}`} q={question} m={m} /> : null;
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#060914" }}>
    <Tabs tabBar={(p) => <Dock {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#060914" } }}>
      <Tabs.Screen name="ask" options={{ title: "Rules" }} />
      <Tabs.Screen name="index" options={{ title: "Inbox" }} />
      <Tabs.Screen name="sent" options={{ title: "Sent" }} />
      <Tabs.Screen name="run" options={{ title: "Live (shopping)" }} />
      <Tabs.Screen name="party" options={{ title: "Orders" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="memory" options={{ title: "Memory" }} />
    </Tabs>
    <AskOverlay />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 10 },
  dock: { flexDirection: "row", alignItems: "flex-end", height: 66, borderRadius: 26, backgroundColor: "rgba(14,12,34,0.94)", borderWidth: 1, borderColor: "rgba(167,139,250,0.35)", paddingHorizontal: 4, shadowColor: "#8B5CF6", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  item: { flex: 1, height: 66, alignItems: "center", justifyContent: "center", gap: 3 },
  glow: { position: "absolute", top: 10, width: 38, height: 30, borderRadius: 15, backgroundColor: "rgba(139,92,246,0.22)", shadowColor: "#8B5CF6", shadowOpacity: 0.9, shadowRadius: 12 },
  label: { fontSize: 8.5, fontWeight: "900", letterSpacing: 0.8, fontFamily: F.mono },
  orbSlot: { flex: 1.1, alignItems: "center", paddingBottom: 8 },
  orb: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", marginTop: -26, borderWidth: 3, borderColor: "#0E0C22", shadowColor: "#EC4899", shadowOpacity: 0.6, shadowRadius: 14 },
  orbOn: { shadowOpacity: 1, shadowRadius: 22, borderColor: "#fff" },
  badge: { position: "absolute", top: 6, right: "18%", minWidth: 18, height: 18, borderRadius: 9, backgroundColor: OS.amber, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, shadowColor: OS.amber, shadowOpacity: 1, shadowRadius: 8 },
  badgeText: { color: "#1A1200", fontSize: 10.5, fontWeight: "900" },
});
