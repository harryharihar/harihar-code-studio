import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { Brand } from "@/constants/brand";
import { sortItems } from "@/store/items";
import type { SavedItem } from "@/types";
import { whenLabel } from "@/utils/when";

const ICON = { reminder: "⏰", task: "✅", note: "📝" } as const;

// Part 4: "My Plan" — everything saved on the phone. Timed items first;
// a bell means a notification is set. Tick = done (removes it and its notification).
export function Upcoming({ items, onDone }: { items: SavedItem[]; onDone: (item: SavedItem) => void }) {
  if (items.length === 0) return null;
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.box}>
      <Text style={styles.heading}>📋 My Plan · {items.length}</Text>
      {sortItems(items).map((i) => (
        <Animated.View key={i.id} layout={LinearTransition} entering={FadeInDown} style={styles.row}>
          <Text style={styles.icon}>{ICON[i.intent]}</Text>
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={1}>{i.title}{i.priority === "high" ? "  🔥" : ""}</Text>
            <Text style={styles.when}>
              {whenLabel(i.date, i.time) ?? "Note"}
              {i.notificationId ? "  · 🔔" : ""}
            </Text>
          </View>
          {/* Upcoming.tsx — tick = done */}
          <Pressable onPress={() => onDone(i)} hitSlop={10} style={styles.done}
            accessibilityRole="button" accessibilityLabel={`Mark ${i.title} done`}>
            <Ionicons name="checkmark" size={16} color={Brand.green} />
          </Pressable>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  heading: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    flex: 1,
  },
  title: {
    color: Brand.text,
    fontSize: 15,
    fontWeight: "700",
  },
  when: {
    color: Brand.textMuted,
    fontSize: 13,
    marginTop: 1,
  },
  done: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Brand.green,
    alignItems: "center",
    justifyContent: "center",
  },
});
