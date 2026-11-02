import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Upcoming } from "@/components/Upcoming";
import { Brand, Gradients } from "@/constants/brand";
import { cancelFor, setupNotifications } from "@/notify/reminders";
import { loadItems, storeItems } from "@/store/items";
import type { SavedItem } from "@/types";

const logo = require("@/assets/images/hcs-logo.png");

// Part 5 home: one way to use the assistant, a live call, and the list she keeps for you.
export default function HomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const itemsRef = useRef<SavedItem[]>([]);

  // Ask for notification permission once, up front.
  useEffect(() => { setupNotifications(); }, []);

  // Reload the list every time this screen comes back, because a live call can save things.
  useFocusEffect(useCallback(() => {
    loadItems().then((list) => { itemsRef.current = list; setItems(list); });
  }, []));

  function setAndStore(next: SavedItem[]) {
    itemsRef.current = next;
    setItems(next);
    storeItems(next);
  }

  // ✓ = done: the item stays (struck through), its notification is cancelled
  async function onItemDone(item: SavedItem) {
    await cancelFor(item);
    setAndStore(itemsRef.current.map((i) => (i.id === item.id ? { ...i, done: true, notificationId: null } : i)));
  }

  // 🗑 = delete: removed from AsyncStorage for good, notification cancelled
  async function onItemDelete(item: SavedItem) {
    await cancelFor(item);
    setAndStore(itemsRef.current.filter((i) => i.id !== item.id));
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.glow} />

      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerLogoDisc}>
          <Image source={logo} style={styles.headerLogo} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.brand} numberOfLines={1}>Voice Assistant</Text>
        </View>
        <View style={styles.online}>
          <View style={styles.statusDot} />
          <Text style={styles.onlineText}>Ready</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Part 5: no record → send → wait. A live call instead. */}
        <Pressable onPress={() => router.push("/live")} style={({ pressed }) => [styles.callCard, pressed && { opacity: 0.9 }]}
          accessibilityRole="button" accessibilityLabel="Start a live call">
          <View style={styles.callTop}>
            <View style={styles.orb}><Text style={styles.orbText}>AI</Text></View>
            <View style={styles.callText}>
              <Text style={styles.callTitle}>Call your assistant</Text>
              <Text style={styles.callSub}>Just talk, interrupt any time. She saves reminders for you.</Text>
            </View>
          </View>
          <View style={styles.tryRow}>
            {["“Kal subah 9 baje client ko call”", "“Do minute baad paani peena”", "“Mera kal ka plan kya hai?”"].map((t) => (
              <View key={t} style={styles.try}><Text style={styles.tryText}>{t}</Text></View>
            ))}
          </View>
          <View style={styles.callButton}>
            <Ionicons name="call" size={20} color="#06130E" />
            <Text style={styles.callButtonText}>Start live call</Text>
          </View>
        </Pressable>

        <Upcoming items={items} onDone={onItemDone} onDelete={onItemDelete} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bg },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 460, experimental_backgroundImage: Gradients.glow },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  headerLogoDisc: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.cream, overflow: "hidden",
    boxShadow: "0 0 0 2px rgba(139, 108, 255, 0.45)",
  },
  headerLogo: { width: 44, height: 44 },
  headerText: { flex: 1 },
  greeting: { color: Brand.textMuted, fontSize: 13, fontWeight: "600" },
  brand: { color: Brand.text, fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
  online: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border,
  },
  onlineText: { color: Brand.textSoft, fontSize: 12, fontWeight: "700" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.green, boxShadow: "0 0 6px rgba(45, 212, 160, 0.9)" },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40, gap: 16 },

  callCard: {
    borderRadius: 28, padding: 20, gap: 16, borderWidth: 1, borderColor: "rgba(139, 108, 255, 0.45)",
    experimental_backgroundImage: Gradients.card, boxShadow: "0 12px 40px rgba(139, 108, 255, 0.25)",
  },
  callTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  orb: {
    width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center",
    experimental_backgroundImage: Gradients.violet, boxShadow: "0 0 24px rgba(139, 108, 255, 0.7)",
  },
  orbText: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  callText: { flex: 1, gap: 4 },
  callTitle: { color: Brand.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  callSub: { color: Brand.textSoft, fontSize: 14, lineHeight: 20 },
  tryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  try: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: "rgba(11, 10, 20, 0.45)",
    borderWidth: 1, borderColor: "rgba(139, 108, 255, 0.3)",
  },
  tryText: { color: Brand.textSoft, fontSize: 13 },
  callButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15,
    borderRadius: 18, experimental_backgroundImage: Gradients.green, boxShadow: "0 6px 20px rgba(45, 212, 160, 0.35)",
  },
  callButtonText: { color: "#06130E", fontSize: 17, fontWeight: "800" },
});
